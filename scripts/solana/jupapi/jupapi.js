const { Transaction, VersionedTransaction, sendAndConfirmTransaction, ComputeBudgetProgram, SystemProgram, PublicKey, Keypair } = require('@solana/web3.js');
const { NATIVE_MINT, transfer, createTransferInstruction, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const axios = require('axios');
const { connection, bot, jitoConnection, fetchTokenAccountData, getRandomTipAccount } = require('./config');
const base58 = require("bs58");
const ethers = require("ethers");
const baseDao = require("../utils/mysqlsol");
const utils = require("../utils/utils");
const redis = require("../utils/redis");
const lanutils = require("../utils/lan/lanutils");
const okxwebapi = require("./okxwebapi");
const { JitoJsonRpcClient } = require('./JitoJsonRpcClient');

async function jupSwap(address, inputMint, outputMint, amount, order, from = "api") {
    console.log("jupSwap", address, inputMint, outputMint, amount, order, from);
    // 处理SOL地址标准化
    if (inputMint === "11111111111111111111111111111111") {
        inputMint = NATIVE_MINT.toBase58();
    }
    if (outputMint === "11111111111111111111111111111111") {
        outputMint = NATIVE_MINT.toBase58();
    }
    // 加载用户信息和配置
    let appmembers = await baseDao.syncQuery("SELECT wallet.secretkey,member.* FROM `appwalletuser` wallet LEFT JOIN appmember member ON member.tg_id = wallet.tg_id WHERE address = ?",
        [address]);
    let member = appmembers[0];
    const owner = Keypair.fromSecretKey(base58.default.decode(utils.decrypt(member.secretkey)));
    let mode = member.mode;
    let slippage = member.qmode_slip; // 滑点
    if (mode == 1) {
        slippage = member.jmode_slip; // 滑点
    }
    let botSwapFeeRatio = 0.01;
    let solprice = await redis.get("solprice");

    // 通知用户交易开始
    if (order) {
        await bot.api.sendMessage(member.tg_id, "挂单已触发指定价格交易执行中..");
    } else {
        await bot.api.sendMessage(member.tg_id, "交易执行中..");
    }

    // 设置优先费用
    const isInputSol = inputMint === NATIVE_MINT.toBase58();
    let priorityFeeInSol = 0;
    if (isInputSol) {
        priorityFeeInSol = Number(member.buygas) * 1e9;
    }
    const isOutputSol = outputMint === NATIVE_MINT.toBase58();
    if (isOutputSol) {
        priorityFeeInSol = Number(member.sellgas) * 1e9;
    }
    priorityFeeInSol = priorityFeeInSol.toFixed(0);

    try {
        // 获取Jupiter报价
        const quoteConfig = {
            method: 'get',
            url: `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage * 100}&platformFeeBps=${100}`,
            headers: {
                'Accept': 'application/json'
            }
        };
        const quoteResponse = await axios.request(quoteConfig);
        if (!quoteResponse.data || quoteResponse.data.error) {
            await bot.api.sendMessage(member.tg_id, "获取交易报价失败");
            return null;
        }
        console.log("swapResponse", quoteResponse.data);
        // 执行交换交易 - 使用和示例代码一致的API端点和参数格式
        const swapResponse = await axios.post('https://lite-api.jup.ag/swap/v1/swap', {
            quoteResponse: quoteResponse.data,
            userPublicKey: owner.publicKey.toString(),
            feeAccount: "7N5mcbwqrExV3zALyUDDUTGoAB7gkRsgwdMcY6D3cd3R",
            prioritizationFeeLamports: {
                priorityLevelWithMaxLamports: {
                    maxLamports: 10000000,
                    priorityLevel: "veryHigh"
                }
            },
            dynamicComputeUnitLimit: true
        });

        console.log("swapResponse", swapResponse.data);
        if (!swapResponse.data || !swapResponse.data.swapTransaction) {
            await bot.api.sendMessage(member.tg_id, "创建交易失败");
            return null;
        }

        // 解码交易
        const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
        let transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        // 计算交易手续费
        let fee = 0;
        if (isInputSol) {
            fee = (amount * Number(botSwapFeeRatio)).toFixed(0);
        } else {
            let prices = await okxwebapi.getTokenPrice(inputMint);
            if (prices.length > 0) {
                let price = prices[0].price;
                let tokenAmount = ethers.utils.formatUnits(amount, prices[0].decimal);
                fee = ((Number(tokenAmount) * price * 1e9) / solprice * Number(botSwapFeeRatio)).toFixed(0);
            }
        }
        // 如果是防夹交易模式，添加小费
        if (Number(mode) === 1) {
            console.log("防夹交易模式");
        }

        // 选择连接
        let myConnection = connection;
        if (Number(mode) === 1) {
            myConnection = jitoConnection;
        }

        try {
            let txId = '';

            // 防夹模式处理
            if (Number(mode) === 1) {
                console.log("防夹交易模式");
                // 获取最新的区块哈希
                const recentBlockHash = await connection.getLatestBlockhash();
                transaction.sign([owner]);

                // 创建小费交易
                const serializedTransaction = transaction.serialize();
                const base58Transaction = base58.default.encode(serializedTransaction);

                // 获取小费金额
                let floor = await axios.get("https://bundles.jito.wtf/api/v1/bundles/tip_floor");
                let jitoset = await redis.get(member.tg_id+"jitoset");
                if (jitoset == null) {
                    jitoset = 2;
                }

                let lamports = Number(floor.data[0].landed_tips_75th_percentile) * 1e9;
                if (jitoset == 1) {
                    lamports = Number(floor.data[0].landed_tips_25th_percentile) * 1e9;
                } else if (jitoset == 2) {
                    lamports = Number(floor.data[0].landed_tips_75th_percentile) * 1e9;
                } else if (jitoset == 3) {
                    lamports = Number(floor.data[0].landed_tips_95th_percentile) * 1e9;
                } else if (jitoset == 4) {
                    lamports = Number(floor.data[0].landed_tips_99th_percentile) * 1e9;
                } else {
                    lamports = Number(jitoset) * 1e9;
                }

                lamports = lamports.toFixed(0);
                console.log("小费金额:", lamports);

                // 创建小费转账指令
                const transferInstruction = SystemProgram.transfer({
                    fromPubkey: owner.publicKey, // 付款地址
                    toPubkey: new PublicKey(getRandomTipAccount()), // 收款地址
                    lamports: lamports, // 转账金额
                });

                // 创建小费交易
                const tipTransaction = new Transaction().add(transferInstruction);
                tipTransaction.recentBlockhash = recentBlockHash.blockhash;
                tipTransaction.feePayer = owner.publicKey;
                tipTransaction.sign(owner);

                // 序列化小费交易
                const serializedTipTransaction = tipTransaction.serialize();
                const base58TipTransaction = base58.default.encode(serializedTipTransaction);

                // 使用 JitoJsonRpcClient 发送交易包
                const jitoClient = new JitoJsonRpcClient('https://mainnet.block-engine.jito.wtf/api/v1', "");
                const result = await jitoClient.sendBundle([[base58Transaction, base58TipTransaction]]);
                txId = result.result;
            } else {
                transaction.sign([owner]);
                txId = await myConnection.sendRawTransaction(transaction.serialize(), {
                    skipPreflight: true,
                    preflightCommitment: 'processed'
                });
            }

            // 计算要记录的交易数据
            const type = isInputSol ? "buy" : "sell";
            const inamount = isInputSol ? 0 : amount;
            const recordAmount = isInputSol ? amount : 0;

            // 发送交易确认消息
            const message = await bot.api.sendMessage(member.tg_id,
                "✅已广播正在链上交易中！" + (Number(mode) == 0 ? "[" + await lanutils.lan("djck", member.tg_id) + "](https://solscan.io/tx/" + txId + ")" : "") + " \n",
                {
                    parse_mode: "Markdown",
                    disable_web_page_preview: true
                }
            );
            // 插入交易记录
            await baseDao.syncQuery(
                "INSERT INTO `appswaporder` (`address`, `token`, `intoken`, `amount`, `hash`, `time`, `type`, `dex`, `upgas`, `inamount`, `price`, `fee`, `check`, `chatid`, `messageId`, `from`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                    owner.publicKey.toBase58(),
                    isInputSol ? outputMint : "11111111111111111111111111111111",
                    isInputSol ? "11111111111111111111111111111111" : inputMint,
                    isInputSol ? amount : 0,
                    txId,
                    new Date(),
                    type,
                    "jupiter",
                    priorityFeeInSol,
                    inamount,
                    0,
                    fee / 1e9,
                    1,
                    message.chat.id,
                    message.message_id,
                    from
                ]
            );
            console.log("交易hash", txId);
            return txId;
        } catch (e) {
            console.error("交易执行失败:", e);
            await bot.api.sendMessage(member.tg_id, "交易失败");
            return null;
        }
    } catch (error) {
        console.error("Jupiter API调用失败:", error);
        await bot.api.sendMessage(member.tg_id, "交易过程中出错");
        return null;
    }
}

// 高级交易功能
async function advanceJupSwap(address, inputMint, outputMint, amount, percent, from = "api") {
    // 处理SOL地址标准化
    if (inputMint === "11111111111111111111111111111111") {
        inputMint = NATIVE_MINT.toBase58();
    }
    if (outputMint === "11111111111111111111111111111111") {
        outputMint = NATIVE_MINT.toBase58();
    }

    // 加载用户信息和配置
    let appmembers = await baseDao.syncQuery("SELECT wallet.secretkey,member.* FROM `appwalletuser` wallet LEFT JOIN appmember member ON member.tg_id = wallet.tg_id WHERE address = ?",
        [address]);
    let member = appmembers[0];
    const owner = Keypair.fromSecretKey(base58.default.decode(utils.decrypt(member.secretkey)));
    let mode = member.mode;
    let slippage = member.qmode_slip; // 滑点
    if (mode == 1) {
        slippage = member.jmode_slip; // 滑点
    }
    let botSwapFeeRatio = await redis.get("botSwapFeeRatio");
    let solprice = await redis.get("solprice");

    await bot.api.sendMessage(member.tg_id, "刮刀交易执行中..");
    console.log("slippage",slippage)

    // 设置优先费用
    const isInputSol = inputMint === NATIVE_MINT.toBase58();
    let priorityFeeInSol = 0;
    if (isInputSol) {
        priorityFeeInSol = Number(member.buygas) * 1e9;
    }
    const isOutputSol = outputMint === NATIVE_MINT.toBase58();
    if (isOutputSol) {
        priorityFeeInSol = Number(member.sellgas) * 1e9;
    }
    priorityFeeInSol = priorityFeeInSol.toFixed(0);

    try {
        let txId = '';

        const quoteConfig = {
            method: 'get',
            url: `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage * 100}&platformFeeBps=100`,
            headers: {
                'Accept': 'application/json'
            }
        };
        const quoteResponse = await axios.request(quoteConfig);

        if (!quoteResponse.data || quoteResponse.data.error) {
            await bot.api.sendMessage(member.tg_id, "获取交易报价失败");
            return null;
        }
        console.log("swapResponse", quoteResponse.data);
        // 执行交换交易 - 使用和示例代码一致的API端点和参数格式
        const swapResponse = await axios.post('https://lite-api.jup.ag/swap/v1/swap', {
            quoteResponse: quoteResponse.data,
            userPublicKey: owner.publicKey.toString(),
            prioritizationFeeLamports: {
                priorityLevelWithMaxLamports: {
                    maxLamports: 10000000,
                    priorityLevel: "veryHigh"
                }
            },
            dynamicComputeUnitLimit: true,
            feeAccount: "7N5mcbwqrExV3zALyUDDUTGoAB7gkRsgwdMcY6D3cd3R",
        });

        console.log("swapResponse", swapResponse.data);
        if (!swapResponse.data || !swapResponse.data.swapTransaction) {
            await bot.api.sendMessage(member.tg_id, "创建交易失败");
            return null;
        }

        // 解码交易
        const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
        let transaction = VersionedTransaction.deserialize(swapTransactionBuf);

        // 计算交易手续费
        let fee = 0;
        if (isInputSol) {
            fee = (amount * Number(botSwapFeeRatio)).toFixed(0);
        } else {
            let prices = await okxwebapi.getTokenPrice(inputMint);
            if (prices.length > 0) {
                let price = prices[0].price;
                let tokenAmount = ethers.utils.formatUnits(amount, prices[0].decimal);
                fee = ((Number(tokenAmount) * price * 1e9) / solprice * Number(botSwapFeeRatio)).toFixed(0);
            }
        }
        // 选择连接
        let myConnection = connection;
        if (Number(mode) === 1) {
            myConnection = jitoConnection;
        }

        // 如果是防夹交易模式，添加小费
        if (Number(mode) === 1) {
            console.log("防夹交易模式");
            // 获取最新的区块哈希
            const recentBlockHash = await connection.getLatestBlockhash();
            transaction.sign([owner]);

            // 创建小费交易
            const serializedTransaction = transaction.serialize();
            const base58Transaction = base58.default.encode(serializedTransaction);

            // 获取小费金额
            let floor = await axios.get("https://bundles.jito.wtf/api/v1/bundles/tip_floor");
            let jitoset = await redis.get(member.tg_id+"jitoset");
            if (jitoset == null) {
                jitoset = 2;
            }

            let lamports = Number(floor.data[0].landed_tips_75th_percentile) * 1e9;
            if (jitoset == 1) {
                lamports = Number(floor.data[0].landed_tips_25th_percentile) * 1e9;
            } else if (jitoset == 2) {
                lamports = Number(floor.data[0].landed_tips_75th_percentile) * 1e9;
            } else if (jitoset == 3) {
                lamports = Number(floor.data[0].landed_tips_95th_percentile) * 1e9;
            } else if (jitoset == 4) {
                lamports = Number(floor.data[0].landed_tips_99th_percentile) * 1e9;
            } else {
                lamports = Number(jitoset) * 1e9;
            }

            lamports = lamports.toFixed(0);
            console.log("小费金额:", lamports);

            // 创建小费转账指令
            const transferInstruction = SystemProgram.transfer({
                fromPubkey: owner.publicKey, // 付款地址
                toPubkey: new PublicKey(getRandomTipAccount()), // 收款地址
                lamports: lamports, // 转账金额
            });

            // 创建小费交易
            const tipTransaction = new Transaction().add(transferInstruction);
            tipTransaction.recentBlockhash = recentBlockHash.blockhash;
            tipTransaction.feePayer = owner.publicKey;
            tipTransaction.sign(owner);

            // 序列化小费交易
            const serializedTipTransaction = tipTransaction.serialize();
            const base58TipTransaction = base58.default.encode(serializedTipTransaction);

            // 使用 JitoJsonRpcClient 发送交易包
            const jitoClient = new JitoJsonRpcClient('https://mainnet.block-engine.jito.wtf/api/v1', "");
            const result = await jitoClient.sendBundle([[base58Transaction, base58TipTransaction]]);
            txId = result.result;
        } else {
            // 然后发送主交易
            transaction.sign([owner]);
            txId = await myConnection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: true,
                preflightCommitment: 'processed'
            });
        }

        // 计算要记录的交易数据
        const type = isInputSol ? "buy" : "sell";

        if (isInputSol) {
            // 处理购买型交易
            let normalizedAmount = amount / 1e9; // 转换为可读格式
            let inamount = 0;
            let price = 0;

            // 发送交易确认消息
            const message = await bot.api.sendMessage(member.tg_id,
                "✅已广播正在链上交易中！" + (Number(mode) == 0 ? "[" + await lanutils.lan("djck", member.tg_id) + "](https://solscan.io/tx/" + txId + ")" : "") + " \n",
                {
                    parse_mode: "Markdown",
                    disable_web_page_preview: true
                }
            );

            // 根据percent对象是否存在决定插入的数据库字段
            if (percent) {
                // 检查并设置默认值，与raydiumhelp保持一致
                if (percent.stoplossamountpercent == null) {
                    percent.stoplossamountpercent = 0;
                }
                if (percent.pricemaxcheck == null) {
                    percent.pricemaxcheck = 0;
                }
                if (percent.stopmaxnum == null) {
                    percent.stopmaxnum = 3;
                }

                // 插入带有percent参数的交易记录
                await baseDao.syncQuery(
                    "INSERT INTO `appswaporder` (`address`, `token`, `intoken`, `amount`, `hash`, `time`, `type`, `dex`, `upgas`, `inamount`, `price`, `fee`, `check`, `chatid`, `messageId`, `stopearnpercent`, `stoplosspercen`, `amountpercent`, `stopmode`, `stoplossamountpercent`, `pricemaxcheck`, `stopmaxnum`, `from`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    [
                        owner.publicKey.toBase58(),
                        outputMint,
                        "11111111111111111111111111111111",
                        normalizedAmount,
                        txId,
                        new Date(),
                        type,
                        "jupiter",
                        priorityFeeInSol,
                        inamount,
                        price,
                        fee / 1e9,
                        1,
                        message.chat.id,
                        message.message_id,
                        percent.stopearnpercent,
                        percent.stoplosspercent,
                        percent.amountpercent,
                        "1",
                        percent.stoplossamountpercent,
                        percent.pricemaxcheck,
                        percent.stopmaxnum,
                        from
                    ]
                );
            } else {
                // 插入普通交易记录
                await baseDao.syncQuery(
                    "INSERT INTO `appswaporder` (`address`, `token`, `intoken`, `amount`, `hash`, `time`, `type`, `dex`, `upgas`, `inamount`, `price`, `fee`, `check`, `chatid`, `messageId`, `from`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    [
                        owner.publicKey.toBase58(),
                        outputMint,
                        "11111111111111111111111111111111",
                        normalizedAmount,
                        txId,
                        new Date(),
                        type,
                        "jupiter",
                        priorityFeeInSol,
                        inamount,
                        price,
                        fee / 1e9,
                        1,
                        message.chat.id,
                        message.message_id,
                        from
                    ]
                );
            }

            console.log("交易hash", txId);
            return txId;
        }

        // 卖出型交易的处理逻辑(如果需要)可以在这里添加

    } catch (error) {
        console.error("Jupiter高级交易失败:", error);
        await bot.api.sendMessage(member.tg_id, "交易过程中出错");
        return null;
    }
}
