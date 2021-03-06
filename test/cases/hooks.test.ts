import { RPC } from "../../src/index";

import assert from "assert";
import AddressInfo from "../../src/domain/AddressInfo";
import waitForEvent from "./utils/WaitForEvent";

describe("Jigsaw Hooks Test",function(){
    this.timeout(30000);

    let app : any={};
    before(()=>{
        app.registry = new RPC.registry.Server();
    });

    it("should be successful to redirect to jigsaw itself if use pre hook",async ()=>{

        let remote = RPC.GetJigsaw({name:"remote"});
        remote.port("get",async()=>{
            return 123;
        });

        let invoker = RPC.GetJigsaw();
        await waitForEvent(invoker,"ready");
        assert.strictEqual(await invoker.send("remote:get",{}),123);

        
        invoker.pre(async (ctx,next)=>{
            ctx.route = {
                async preload(){
                    
                },
                async getAddressInfo(){
                    return new AddressInfo("127.0.0.1",invoker.getAddress().port);
                }
            }
            await next();
        });
        invoker.port("get",async()=>{
            return 456;
        });

        assert.strictEqual(await invoker.send("remote:get",{}),456);
      
        await invoker.close();
        await remote.close();
    });
    it("should be successful if modify jigsaw invoking result",async()=>{
        let remote = RPC.GetJigsaw({name:"remote"});
        let invoker = RPC.GetJigsaw();

        remote.use(async(ctx,next)=>{

            await next();
            if(ctx.data.msg == "hello")
                ctx.result.msg = "hacked";
        })
        remote.port("get",()=>{
            return { msg : "hello,too" };
        });

        await Promise.all([waitForEvent(remote,"ready"),waitForEvent(invoker,"ready")]);

        let result : any = await invoker.send("remote:get",{ msg:"hello" });
        assert.strictEqual(result.msg,"hacked");
        
        let result2 : any = await invoker.send("remote:get",{ msg:"hello?" });
        assert.strictEqual(result2.msg,"hello,too");
        
        await invoker.close();
        await remote.close();
    });
    it("should throw error if pre hook emit an error",async()=>{
        let jg = RPC.GetJigsaw({name:"jigsaw"});
        jg.port("call",async()=>(123));

        await waitForEvent(jg,"ready");
        let err = new Error("this is an error");
        jg.pre(async (ctx,next)=>{
            
            ctx.data = "123";
            await next();

        })
        jg.pre(async (ctx,next)=>{
            throw err;
        });

        try{
            await jg.send("jigsaw:call",{});
        }catch(err_catched){
            assert.strictEqual(err_catched,err);
        }

        await jg.close();

    });

it("should throw error if post hook emit an error",async()=>{
        let jg = RPC.GetJigsaw({name:"jigsaw"});
        jg.port("call",async()=>(123));

        await waitForEvent(jg,"ready");
        let err = new Error("this is an error");
        jg.pre(async (ctx,next)=>{
            
            ctx.data = "123";
            await next();

        })
        jg.post(async (ctx,next)=>{
            throw err;
        });

        try{
            await jg.send("jigsaw:call",{});
        }catch(err_catched){
            assert.strictEqual(err_catched,err);
        }

        await jg.close();

    });
    it("should throw the hacked error if post result has been modified",async ()=>{
        let jg = RPC.GetJigsaw({name:"jigsaw"});
        jg.port("call",async()=>(123));
        await waitForEvent(jg,"ready");

        class HackedError extends Error{};
        let hacked_err = new HackedError();
        jg.post(async (ctx:any,next:any)=>{

            ctx.result = hacked_err;
            await next();
        });

        try{
            await jg.send("jigsaw:call",{});
        }catch(err){
            assert.strictEqual(err,hacked_err);
        }

        await jg.close();
    });
    it("should return the hacked result if post result has been modified",async ()=>{
        let jg = RPC.GetJigsaw({name:"jigsaw"});
        jg.port("call",async()=>(123));
        await waitForEvent(jg,"ready");
        
        jg.post(async (ctx:any,next:any)=>{
            ctx.result = ctx.data;
            await next();
        });

        let ret :any = await jg.send("jigsaw:call",{result:"abcdefg"});
        assert.strictEqual(ret.result,"abcdefg");

        await jg.close();
    });


    after(async ()=>{
        await app.registry.close();

    })

});
