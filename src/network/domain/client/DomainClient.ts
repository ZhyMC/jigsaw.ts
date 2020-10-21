import NetPacketRouter = require("../../request/packetrouter/NetPacketRouter");
import QueryDomainRequest = require("../../request/QueryDomainRequest");
import AddressInfo = require("../AddressInfo");
import IDomainClient = require("./IDomainClient");
import DomainUpdatePacket = require("../../protocol/packet/DomainUpdatePacket");
import Events = require("tiny-typed-emitter");
import util = require("util");
import LimitedMap = require("../../../utils/LimitedMap");
const debug = require("debug")("DomainClient");

const sleep = util.promisify(setTimeout);


interface DomainClientEvent{
	ready: () => void;
	close: () => void;	
}

class DomainCache{
    public addrinfo : AddressInfo;
    public createTime : number = new Date().getTime();
    public expired : number;
    constructor(addrinfo : AddressInfo,expired : number = 10 * 1000){
        this.addrinfo = addrinfo;
        this.expired = expired;
    }
}

class DomainClient extends Events.TypedEmitter<DomainClientEvent> implements IDomainClient{
    private address : AddressInfo;
    private router : NetPacketRouter;
    private request_seq : number = 0;
    private state : string = "close";
    private client_name : string;
    private entry_address : string ;
    private loop : boolean = false;
    private cache = new LimitedMap<string,DomainCache>(1000);

    constructor(client_name:string,entry_address:string,server_address:AddressInfo,router:NetPacketRouter){
        super();
        this.address = server_address;
        this.router = router;
        this.client_name = client_name;
        this.entry_address = entry_address;

        this.router.on("ready",()=>{
            this.state = "ready";
            this.emit("ready");
            this.start_updating_loop();
        });
        this.router.on("close",()=>{
            this.state = "close";
            this.emit("close");
        });

    }
    private getAddress() : AddressInfo{
        let client = this.router.getClient();
        let socket = client.getSocket();
        return socket.getAddress();
    }
	public async start_updating_loop(){
        
        this.loop = true;
		while(this.loop == true){
            
            let addr = this.getAddress();
            let update_addr = new AddressInfo(this.entry_address,addr.port);

            //console.log("update",update_addr);
            try{
                this.updateAddress(this.client_name,update_addr);

            }catch(err){
                console.error("updating address error",err);
            }
 			await sleep(10*1000);
		}
        this.router.close();
        
    }
    close(){
        this.loop = false;
    }
    async resolve(jgname:string,onlycache = false,timeout:number = 5000) : Promise<AddressInfo>{
        if(this.cache.has(jgname)){
            let cache = this.cache.get(jgname) as DomainCache;
            let expired = cache.createTime + cache.expired - new Date().getTime();
            if(expired > 0) // meet cache
                return cache.addrinfo;
            
        }else{
            if(onlycache)
                throw new Error("dont have this address cache")
        }

        

        let addrinfo = await this.doResolve(jgname,timeout);
        debug("real resolve",jgname,addrinfo);


        this.cache.set(jgname,new DomainCache(addrinfo));

        return addrinfo;
    }
    private async doResolve(jgname:string,timeout:number){
        let start_time = new Date().getTime();
        for(let i=0;i<5;i++){
            try{
                let req=new QueryDomainRequest(jgname,this.address,this.router,this.request_seq++);
                return await req.run();    
            }catch(err){
                //console.log(err);

            }
            let time=new Date().getTime();

            if(time - start_time > timeout)
                break;
            
            await sleep(200);
        }
        throw new Error("resolve reach its max retry time");
        
    }
    updateAddress(jgname:string,addrinfo:AddressInfo):void{
        let pk=new DomainUpdatePacket();
        pk.jgname=jgname;
        pk.addrinfo = addrinfo;
        
        this.router.sendPacket(pk,this.address.port,this.address.address);
    }

}

export = DomainClient;
