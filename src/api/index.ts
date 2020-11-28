import RegistryServer from "../network/domain/server/jigsaw/RegistryServer";
import IJigsaw from "../jigsaw/IJigsaw";
import SimpleJigsaw from "../jigsaw/SimpleJigsaw";

import RegistryRoute from "../network/router/route/RegistryRoute";
import UDPSocket from "../network/socket/UDPSocket";
import SimplePacketRouter from "../network/router/packetrouter/SimplePacketRouter";
import InvokeHandler from "../network/handler/InvokeHandler";
import InvokeRequest from "../network/request/InvokeRequest";
import BuilderNetworkClient from "../network/client/BuilderNetworkClient";
import RegistryClient from "../network/domain/client/RegistryClient";
import PacketBuilderManager from "../network/protocol/builder/manager/PacketBuilderManager";
import {JigsawOption} from "../jigsaw/JigsawOption";
import { PostContext, PreContext, UseContext } from "../jigsaw/context/Context";

type NextFunction = ()=>Promise<void>;

type DefaultWare = {
    use:Array<(ctx:UseContext,next:NextFunction)=>Promise<void>>,
    pre:Array<(ctx:PreContext,next:NextFunction)=>Promise<void>>,
    post:Array<(ctx:PostContext,next:NextFunction)=>Promise<void>>
};

const RegistryApi = {
    Server : RegistryServer,
}

const LibContext : {
    default_ware:DefaultWare
} = {
    default_ware:{
        use:[],
        pre:[],
        post:[]
    }
};


function use(work:(ctx:UseContext,next:NextFunction)=>Promise<void>) : void{
    LibContext.default_ware.use.push(work);
}
function pre(work:(ctx:PreContext,next:NextFunction)=>Promise<void>) : void{
    LibContext.default_ware.pre.push(work);
}
function post(work:(ctx:PostContext,next:NextFunction)=>Promise<void>) : void{
    LibContext.default_ware.post.push(work);
}

function GetJigsaw(option? : JigsawOption) : IJigsaw{
    
    let jigsaw = new SimpleJigsaw(option || {},{
        DefaultRoute:RegistryRoute,
        Socket:UDPSocket,
        PacketRouter:SimplePacketRouter,
        InvokeHandler:InvokeHandler,
        InvokeRequest:InvokeRequest,
        NetworkClient:BuilderNetworkClient,
        RegistryClient: RegistryClient,
        BuilderManager:PacketBuilderManager
    });

    for(let use_ware of LibContext.default_ware.use){
        jigsaw.use(use_ware);
    }
    for(let pre_ware of LibContext.default_ware.pre){
        jigsaw.pre(pre_ware);
    }
    for(let post_ware of LibContext.default_ware.post){
        jigsaw.post(post_ware);
    }

    return jigsaw;
};



const RPCApi = {
    pre : pre,
    use : use,
    post : post,
    registry : RegistryApi,
    GetJigsaw : GetJigsaw
}
export default RPCApi;


