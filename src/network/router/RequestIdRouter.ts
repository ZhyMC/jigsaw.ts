import AbstractRouter from "./AbstractRouter";
import Packet from "../protocol/Packet";
const debug = require("debug")("RequestIdRouter");

class RequestIdRouter extends AbstractRouter{
    constructor(){
        super();

    }
    sendPacket(){
        throw new Error("this router can not sendPacket");
    }
    handlePacket(pk:Packet){
        if(!this.hasHandlers(pk.request_id))
            return;

        let handlers=this.getHandlers(pk.request_id);
        
        try{
            for (let i in handlers)
                handlers[i].data(pk);
        }catch(err){
            debug(err);
        }

    }

}

export default RequestIdRouter;