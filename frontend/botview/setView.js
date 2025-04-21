const {Menu} = require("@grammyjs/menu");

const baseDao = require("../utils/mysqlsol");
const swaputils = require("./swaputils");
const redis = require("../utils/redis");
const lanutils = require("../utils/lan/lanutils");
const { getUserWallets } = require("./walletView");
const colseTokenapi = require("./colseTokenapi");

function getAccountRcovery() {

    const accountRcovery = new Menu("accountRcovery");

    accountRcovery.dynamic(async (ctx, range) => {

        range.text(await lanutils.lan("recover_zero_token_accounts", ctx.from.id), async (ctx) => {
            await ctx.reply(await lanutils.lan("submitted_processing", ctx.from.id))
            let myaddress = await swaputils.getFefultForTgId(ctx.from.id);
            await colseTokenapi.closeZeroTokenAccount(myaddress)

        }).row();

        range.text(await lanutils.lan("clean_low_balance_accounts", ctx.from.id), async (ctx) => {
            await ctx.reply(await lanutils.lan("submitted_processing", ctx.from.id))
            let myaddress = await swaputils.getFefultForTgId(ctx.from.id);
            await colseTokenapi.closeNoAmountTokenAccount(myaddress)

        }).row();

        range.text("Refresh", async (ctx) => {
            await ctx.editMessageText(await swaputils.getAccountRecoveryForTgId(ctx.from.id), {
                reply_markup: accountRcovery,
            })
        }).row();
    })
    return accountRcovery;
}

function getznGasprice() {

    const zngasPrice = new Menu("zngasPrice");

    zngasPrice.dynamic(async (ctx, range) => {
        let items = [
            {name: await lanutils.lan("off", ctx.from.id), level: 0},
            {name: await lanutils.lan("on", ctx.from.id), level: 1}
        ];
        let jitoset =  await  redis.get(ctx.from.id+"zngasPrice")
        if (jitoset==null)
        {
            jitoset = 0;
        }
        for (let i=0;i<items.length;i++)
        {
            range.text( `${Number(items[i].level)==Number(jitoset)?'🟢'+items[i].name+'':''+items[i].name+' '}`, async (ctx) => {

                await redis.set(ctx.from.id+"zngasPrice",items[i].level)
                ctx.menu.update();

            }).row();
        }



    })
    return zngasPrice;
}

function getMinAmount() {

    const minAmount = new Menu("minAmount");

    minAmount.dynamic(async (ctx, range) => {
        let items = [
            {name: await lanutils.lan("off", ctx.from.id), level: 0},
            {name: await lanutils.lan("on", ctx.from.id), level: 1}
        ];
        let jitoset =  await  redis.get(ctx.from.id+"minAmount")
        if (jitoset==null)
        {
            jitoset = 0;
        }
        for (let i=0;i<items.length;i++)
        {
            range.text( `${Number(items[i].level)==Number(jitoset)?'🟢'+items[i].name+'':''+items[i].name+' '}`, async (ctx) => {

                await redis.set(ctx.from.id+"minAmount",items[i].level)
                ctx.menu.update();

            }).row();
        }



    })
    return minAmount;
}

function getFangpixiu() {

    const fangpixiu = new Menu("fangpixiu");

    fangpixiu.dynamic(async (ctx, range) => {
        let items = [
            {name: await lanutils.lan("off", ctx.from.id), level: 0},
            {name: await lanutils.lan("on", ctx.from.id), level: 1}
        ];
        let jitoset =  await  redis.get(ctx.from.id+"fangpixiu")
        if (jitoset==null)
        {
            jitoset = 0;
        }
        for (let i=0;i<items.length;i++)
        {
            range.text( `${Number(items[i].level)==Number(jitoset)?'🟢'+items[i].name+'':''+items[i].name+' '}`, async (ctx) => {

                await redis.set(ctx.from.id+"fangpixiu",items[i].level)
                ctx.menu.update();

            }).row();
        }
    })
    return fangpixiu;
}

function getJitoMenu() {

    const JitoMenu = new Menu("JitoMenu");

    JitoMenu.dynamic(async (ctx, range) => {
        let items = [
            {name: await lanutils.lan("low", 0), level:1},
            {name: await lanutils.lan("medium", 0), level:2},
            {name: await lanutils.lan("high", 0), level:3},
            {name: await lanutils.lan("super_high", 0), level:4}
        ];
        let jitoset =  await  redis.get(ctx.from.id+"jitoset")
        if (jitoset==null)
        {
            jitoset = 2;
        }
        for (let i=0;i<items.length;i++)
        {
            range.text( `${Number(items[i].level)==Number(jitoset)?'🟢'+items[i].name+'':''+items[i].name+' '}`, async (ctx) => {

                await redis.set(ctx.from.id+"jitoset",items[i].level)
                ctx.menu.update();

            }).row();

        }
        range.text( `${(Number(jitoset)!=1&&Number(jitoset)!=2&&Number(jitoset)!=3&&Number(jitoset)!=4)?'🟢'+jitoset+' SOL':'自定义'}`, async (ctx) => {
            const sentMessage = await ctx.reply("请输入自定义防夹小费", {
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: await lanutils.lan("请输入自定义防夹小费",ctx.from.id),
                    selective: true
                },
            });
            ctx.session.replyInfo = { type: "jitosetgas", awaitingReplyTo: sentMessage.message_id,ctx:ctx};

        }).row();


    })
    return JitoMenu;
}

function setView() {

    const setting = new Menu("setting")
    setting.dynamic(async (ctx, range) => {
        let appmembers = await baseDao.syncQuery("SELECT * FROM appmember WHERE chain_id = ? and tg_id = ? ", ["1", ctx.from.id]);
        let member = appmembers[0];
        range.text(await lanutils.lan("jsmshd", ctx.from.id), async (ctx) => {
            const sentMessage = await ctx.reply(await lanutils.lan("inputjsmshd", ctx.from.id), {
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: await lanutils.lan("inputjsmshd", ctx.from.id),
                    selective: true
                },
            });
            ctx.session.replyInfo = { type: "qmode_slip", awaitingReplyTo: sentMessage.message_id };

        })
        range.text(await lanutils.lan("fjmshd", ctx.from.id), async (ctx) => {

            const sentMessage = await ctx.reply(await lanutils.lan("inputfjmshd", ctx.from.id), {
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: await lanutils.lan("inputfjmshd", ctx.from.id),
                    selective: true
                },
            });
            ctx.session.replyInfo = { type: "jmode_slip", awaitingReplyTo: sentMessage.message_id };
        }).row()
        range.text(await lanutils.lan("buygas", ctx.from.id), async (ctx) => {

            const sentMessage = await ctx.reply(await lanutils.lan("inputbuygas", ctx.from.id), {
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: await lanutils.lan("inputbuygas", ctx.from.id),
                    selective: true
                },
            });
            ctx.session.replyInfo = { type: "buygas", awaitingReplyTo: sentMessage.message_id };
        })
        range.text(await lanutils.lan("sellgas", ctx.from.id), async (ctx) => {
            const sentMessage = await ctx.reply(await lanutils.lan("inputsellgas", ctx.from.id), {
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: await lanutils.lan("inputsellgas", ctx.from.id),
                    selective: true
                },
            });
            ctx.session.replyInfo = { type: "sellgas", awaitingReplyTo: sentMessage.message_id };
        }).row()


        range.text(`${member.mode == '0' ? "" + await lanutils.lan("jsms", ctx.from.id) + "✅" : await lanutils.lan("jsms", ctx.from.id)}`, async (ctx) => {
            await baseDao.syncQuery("update `appmember` set mode = ? where tg_id = ? and chain_id = ?",
                [0, ctx.from.id, "1"]);
            member.mode = 0
            ctx.menu.update();
        });
        range.text(`${member.mode == '1' ? "" + await lanutils.lan("fjms", ctx.from.id) + "✅" : await lanutils.lan("fjms", ctx.from.id)}`, async (ctx) => {
            await baseDao.syncQuery("update `appmember` set mode = ? where tg_id = ? and chain_id = ?",
                [1, ctx.from.id, "1"]);
            member.mode = 1
            ctx.menu.update();
        }).row()

        let solwalletmode = await redis.get(ctx.from.id + "solwalletmode")
        if (solwalletmode == null) {
            solwalletmode = 1;
        }

        range.text(await lanutils.lan("anti_clip_mode_tip", ctx.from.id), async (ctx) => {
            await ctx.reply(await lanutils.lan("anti_clip_mode_description", ctx.from.id), {
                reply_markup: getJitoMenu(),
                parse_mode: "Markdown",
            });
        })
        range.submenu(await lanutils.lan("buy_sell_button_setting", ctx.from.id), "buyOrSellBtnSetting", async (ctx) => {
            await ctx.editMessageText(await lanutils.lan("buy_sell_button_setting_description", ctx.from.id), {
                reply_markup: buyOrSellBtnSetting(),
                parse_mode: "Markdown",
            });
        }).row()


        range.text(`${solwalletmode == 1 ? "" + await lanutils.lan("onewalletmode", ctx.from.id) + "✅" : await lanutils.lan("onewalletmode", ctx.from.id)}`, async (ctx) => {

            await redis.set(ctx.from.id + "solwalletmode", 1);
            await ctx.reply(await lanutils.lan("msgonewalletmode", ctx.from.id))
            ctx.menu.update();
        })
        range.text(`${solwalletmode == 2 ? "" + await lanutils.lan("morewalletmode", ctx.from.id) + "✅" : await lanutils.lan("morewalletmode", ctx.from.id)}`, async (ctx) => {

            await redis.set(ctx.from.id + "solwalletmode", 2);
            await ctx.reply(await lanutils.lan("msgmorewalletmode", ctx.from.id), { reply_markup: walletList() });
            ctx.menu.update();
        }).row()
        solwalletmode == 2 && range.text(`${await lanutils.lan("morewalletmodeSet", ctx.from.id)}`, async (ctx) => {
            await ctx.reply(await lanutils.lan("msgmorewalletmode", ctx.from.id), { reply_markup: walletList() });
            ctx.menu.update();
        }).row()


        range.text(await lanutils.lan("hide_small_assets", ctx.from.id), async (ctx) => {
            await ctx.reply(await lanutils.lan("hide_small_assets_description", ctx.from.id), {
                reply_markup: getMinAmount(),
                parse_mode: "Markdown",
            });
        })
        range.text(await lanutils.lan("anti_phixiu", ctx.from.id), async (ctx) => {
            await ctx.reply(await lanutils.lan("anti_phixiu_description", ctx.from.id), {
                reply_markup: getFangpixiu(),
                parse_mode: "Markdown",
            });
        }).row()

        range.text(await lanutils.lan("fast_smart_gas", ctx.from.id), async (ctx) => {
            await ctx.reply(await lanutils.lan("fast_smart_gas_description", ctx.from.id), {
                reply_markup: getznGasprice(),
                parse_mode: "Markdown",
            });
        }).row()

    });
    setting.register(buyOrSellBtnSetting());

    return setting;
}

function walletList() {
    const walletList = new Menu("walletList");
    walletList.dynamic(async (ctx, range) =>  {
        let address =  await getUserWallets(ctx);
        // let daddress =  await swaputils.getFefult(ctx);
        console.log('walletList',address);

        for (let i = 0; i < address.length; i++) {
            // let context = (i+1)+":"+address[i].address;
            let context = address[i].address.substring(address[i].address.length - 6);
            range.text((ctx) => `${address[i].moreactive == 0?'🔴   '+context+'   ❌':'🟢   '+context+'   ✅'}`, async (ctx) => {
                console.log("选择了", i)
                if(address[i].moreactive == 0){
                    await baseDao.syncQuery("update appwalletuser set moreactive = 1 where tg_id = ? and chain_id = ? and address = ?",
                        [ctx.from.id,"1",address[i].address]);
                }else{
                    await baseDao.syncQuery("update appwalletuser set moreactive = 0 where tg_id = ? and chain_id = ? and address = ?",
                        [ctx.from.id,"1",address[i].address]);
                }

                ctx.menu.update()
            })
                .row();
        }
    })
    return walletList;
}

function buyOrSellBtnSetting() {
    const buyOrSellBtnSetting = new Menu("buyOrSellBtnSetting")
    buyOrSellBtnSetting.dynamic(async (ctx, range) => {
        const buyList = await redis.getObject(ctx.from.id+"buyConfigList")||[0.1,0.5,1,3,5];
        const sellList = await redis.getObject(ctx.from.id+"sellConfigList")||[50,100];
        range.text("—— 买入按钮配置 ——", async (ctx) => {
        }).row()
        for (let i = 0; i < buyList.length; i++) {
            if(i == 2 || i==4){
                range.text(`买入 ${buyList[i]} SOL🖊`, async (ctx) => {
                    const sentMessage = await ctx.reply("请配置购买按钮", {
                        reply_markup: {
                            force_reply: true,
                            // input_field_placeholder: await lanutils.lan("inputqbmcgz",ctx.from.id),
                            selective: true
                        },
                    })
                    ctx.session.replyInfo = {type: "setBuyBtnValue",awaitingReplyTo: sentMessage.message_id,ctx,index: i};
                }).row();
            }else{
                range.text(`买入 ${buyList[i]} SOL🖊`, async (ctx) => {
                    const sentMessage = await ctx.reply("请配置购买按钮", {
                        reply_markup: {
                            force_reply: true,
                            // input_field_placeholder: await lanutils.lan("inputqbmcgz",ctx.from.id),
                            selective: true
                        },
                    })
                    ctx.session.replyInfo = {type: "setBuyBtnValue",awaitingReplyTo: sentMessage.message_id,ctx,index: i};
                })
            }
        }

        range.text("—— 卖出按钮配置 ——", async (ctx) => {
        }).row()
        for (let i = 0; i < sellList.length; i++) {
            if(i == 1){
                range.text(`卖出 ${sellList[i]}%🖊`, async (ctx) => {
                    const sentMessage = await ctx.reply("请配置卖出按钮", {
                        reply_markup: {
                            force_reply: true,
                            // input_field_placeholder: await lanutils.lan("inputqbmcgz",ctx.from.id),
                            selective: true
                        },
                    })
                    ctx.session.replyInfo = {type: "setSellBtnValue",awaitingReplyTo: sentMessage.message_id,ctx,index: i};
                }).row();
            }else{
                range.text(`卖出 ${sellList[i]}%🖊`, async (ctx) => {
                    const sentMessage = await ctx.reply("请配置卖出按钮", {
                        reply_markup: {
                            force_reply: true,
                            // input_field_placeholder: await lanutils.lan("inputqbmcgz",ctx.from.id),
                            selective: true
                        },
                    })
                    ctx.session.replyInfo = {type: "setSellBtnValue",awaitingReplyTo: sentMessage.message_id,ctx,index: i};
                })
            }
        }
        range.back(await lanutils.lan("back",ctx.from.id), async (ctx) => {
                    await ctx.editMessageText(await swaputils.getSettingText(ctx));
                }).row()
    })
    return buyOrSellBtnSetting
}

function sameBotMenu() {
    const sameBotMenu = new Menu("sameBotMenu");
    sameBotMenu.dynamic(async (ctx, range) => {
        let bots = await baseDao.syncQuery("SELECT * FROM `appbot` WHERE chain = ?", ["sol"])
        for (let i=0;i<bots.length;i++)
        {
            range.url(bots[i].name,bots[i].url).row();
        }
    })
    return sameBotMenu
}

function botMenu() {
    const botMenu = new Menu("botMenu");
    botMenu.dynamic(async (ctx, range) => {
        let bots = await baseDao.syncQuery("SELECT * FROM `appbot` WHERE chain = ?", ["eth"])
        for (let i=0;i<bots.length;i++)
        {
            range.url(bots[i].name,bots[i].url).row();
        }
    })
    return botMenu;
}

function lanMenu() {

    const lanMenu = new Menu("lanMenu");
    lanMenu.dynamic(async (ctx, range) => {
        let lan = await redis.get(ctx.from.id+"lan");
        range.text((ctx) => `${lan=='ch'?"中文✅":"中文"}`
            , async (ctx) => {
                lan ='ch'
                await redis.set(ctx.from.id+"lan",lan)
                ctx.menu.update();

            }).row();
        range.text((ctx) => `${lan=='en'?"English✅":"English️"}`
            , async (ctx) => {
                lan ='en'
                await  redis.set(ctx.from.id+"lan",lan)

                ctx.menu.update();
            }).row();
    })
    return lanMenu;
}

function inviteMenu() {
    const inviteMenu = new Menu("inviteMenu")
     inviteMenu.dynamic(async (ctx, range) => {

        range.text(await lanutils.lan("reload", ctx.from.id), async (ctx) => {
            await ctx.editMessageText(await swaputils.getInviteText(ctx));
        }).row()

        range.text(await lanutils.lan("sztxqb", ctx.from.id), async (ctx) => {
            const sentMessage = await ctx.reply(await lanutils.lan("inputsztxqb", ctx.from.id), {
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: await lanutils.lan("inputsztxqb", ctx.from.id),
                    selective: true
                },
            });
            ctx.session.replyInfo = {type: "autowallet", awaitingReplyTo: sentMessage.message_id, ctx: ctx};
        }).row()
        range.text(await lanutils.lan("tx", ctx.from.id), async (ctx) => {
            let members = await baseDao.syncQuery("SELECT * FROM `appmember` WHERE chain_id = ? AND tg_id = ?", ["1", ctx.from.id])
            let member = members[0]
            if (member.autowallet == null) {
                await ctx.reply("️⚠️ "+await lanutils.lan("sztxqb", ctx.from.id));
                return;
            }
            if (Number(member.invite_amount) > 0.01) {
                let status = 1;
                await baseDao.syncQuery("update `appmember` set invite_endamount = invite_endamount + ?,invite_amount = 0 where tg_id = ? and chain_id = ?",
                    [member.invite_amount, ctx.from.id, "1"]);
                if (Number(member.invite_amount)>=5)
                {
                    //超过需要审核
                    status = 0
                }
                await baseDao.syncQuery(" INSERT INTO `appmemberauto` ( `tg_id`, `address`, `amount`, `time`, `status`) VALUES (?,?,?,?,?)",
                    [ctx.from.id, member.autowallet, member.invite_amount, new Date(), status]);

                await ctx.reply(await lanutils.lan("txtipcg", ctx.from.id)+":" + member.invite_amount);


            } else {
                await ctx.reply("⚠️"+await lanutils.lan("txtip", ctx.from.id));
            }
        }).row()
    })
    return inviteMenu;
}

function myOnOrder()
{
    const myOnOrder = new Menu("myOnOrder");
    myOnOrder.dynamic(async (ctx, range) => {

        range.text(await lanutils.lan("reload", ctx.from.id), async (ctx) => {

            await ctx.editMessageText(await swaputils.getOrdersText(ctx), {reply_markup: myOnOrder,parse_mode: "Markdown",disable_web_page_preview: true});

        }).row();

    })
    return myOnOrder;
}
function myStopOrder() {
    const myStopOrder = new Menu("myStopOrder");
    myStopOrder.dynamic(async (ctx, range) => {
        let pageNo = ctx.session.stopPageNo || 1;
        let pageSize = 4;
        const {total, tokenList, balance} = await swaputils.getStopOrders(ctx.from.id, pageNo);

        range.text(await lanutils.lan("reload", ctx.from.id), async (ctx) => {
            const {text} = await swaputils.getStopOrders(ctx.from.id, pageNo);
            await ctx.editMessageText(text, {
                reply_markup: myStopOrder,
                parse_mode: "Markdown",
                disable_web_page_preview: true
            });

        }).row();

        range.text("一键关闭", async (ctx) => {

            let myaddress = await swaputils.getFefultForTgId(ctx.from.id);
            await baseDao.syncQuery("update appswaponorder set status = 3  WHERE address = ? and fromtype = 1 and `status` = 0", [myaddress]);
            const {text} = await swaputils.getStopOrders(ctx.from.id, 1);
            await ctx.editMessageText(text, {
                reply_markup: myStopOrder,
                parse_mode: "Markdown",
                disable_web_page_preview: true
            });

        }).row();

        if (total > 4) {
            range.text(await lanutils.lan("pageup", ctx.from.id), async (ctx) => {
                if (pageNo > 1) {
                    pageNo--;
                    ctx.session.stopPageNo = pageNo;
                    const {text} = await swaputils.getStopOrders(ctx.from.id, pageNo);
                    await ctx.editMessageText(text, {
                        reply_markup: myStopOrder,
                        parse_mode: "Markdown",
                        disable_web_page_preview: true,
                    });
                }
            });
            range
                .text(await lanutils.lan("pagedown", ctx.from.id), async (ctx) => {
                    if (pageNo < Math.ceil(total / pageSize)) {
                        pageNo++;
                        ctx.session.stopPageNo = pageNo;
                        const {text} = await swaputils.getStopOrders(ctx.from.id, pageNo);
                        await ctx.editMessageText(text, {
                            reply_markup: myStopOrder,
                            parse_mode: "Markdown",
                            disable_web_page_preview: true,
                        });
                    }
                })
                .row();
        }
    })


    return myStopOrder;
}

function getMyEndStopOrder() {
    const myEndStopOrder = new Menu("myEndStopOrder");
    myEndStopOrder.dynamic(async (ctx, range) => {
        let pageNo = ctx.session.stopPageNo || 1;
        let pageSize = 4;
        const {total, tokenList, balance} = await swaputils.getEndStopOrders(ctx.from.id, pageNo);

        range.text(await lanutils.lan("reload", ctx.from.id), async (ctx) => {
            const {text} = await swaputils.getEndStopOrders(ctx.from.id, pageNo);
            await ctx.editMessageText(text, {
                reply_markup: myEndStopOrder,
                parse_mode: "Markdown",
                disable_web_page_preview: true
            });

        }).row();

        if (total > 4) {
            range.text(await lanutils.lan("pageup", ctx.from.id), async (ctx) => {
                if (pageNo > 1) {
                    pageNo--;
                    ctx.session.stopPageNo = pageNo;
                    const {text} = await swaputils.getEndStopOrders(ctx.from.id, pageNo);
                    await ctx.editMessageText(text, {
                        reply_markup: myEndStopOrder,
                        parse_mode: "Markdown",
                        disable_web_page_preview: true,
                    });
                }
            });
            range
                .text(await lanutils.lan("pagedown", ctx.from.id), async (ctx) => {
                    if (pageNo < Math.ceil(total / pageSize)) {
                        pageNo++;
                        ctx.session.stopPageNo = pageNo;
                        const {text} = await swaputils.getEndStopOrders(ctx.from.id, pageNo);
                        await ctx.editMessageText(text, {
                            reply_markup: myEndStopOrder,
                            parse_mode: "Markdown",
                            disable_web_page_preview: true,
                        });
                    }
                })
                .row();
        }
    })


    return myEndStopOrder;
}


module.exports = {
    setView,
    sameBotMenu,
    botMenu,
    lanMenu,
    inviteMenu,
    myOnOrder,
    walletList,
    buyOrSellBtnSetting,
    myStopOrder,
    getJitoMenu,
    getFangpixiu,
    getMinAmount,
    getMyEndStopOrder,
    getznGasprice,
    getAccountRcovery
}
