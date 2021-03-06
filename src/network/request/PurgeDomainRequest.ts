import BaseRequest from "./BaseRequest";
import AddressInfo from "../../domain/AddressInfo";
import Packet from "../protocol/Packet";
import IRouter from "../router/IRouter";
import NetRoute from "../router/route/NetRoute";
import DomainPurgePacket from "../protocol/packet/DomainPurgePacket";

class PurgeDomainRequest extends BaseRequest<void>{
    private jgid : string = "";
    private jgname : string = "";
    private dst : AddressInfo ;
    constructor(jgid:string,jgname:string,dst:AddressInfo,router : IRouter,seq_id : number){
        super(router,seq_id,2*1000); //2s timeout

        this.jgid = jgid;
        this.jgname = jgname;
        
        this.dst = dst;
        
        this.getLifeCycle().setState("ready");
    }
    async send(){
        let pk=new DomainPurgePacket();

        pk.request_id = this.getRequestId();
        pk.jgid = this.jgid;
        pk.jgname = this.jgname;
    
        await this.router.sendPacket(pk,new NetRoute(this.dst.port,this.dst.address));
    }
    getName(){
        return "PurgeDomainRequest";
    }
    async handlePacket(p : Packet){
        this.setResult();
    }
}

export default PurgeDomainRequest;