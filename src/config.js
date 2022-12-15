require("dotenv").config();

/*
.env 파일이 우선적으로 적용됨.
.env 구조

BAIKAL_NLP_HOST="localhost"
BAIKAL_NLP_PORT=5656

*/

const path = require('path');
const grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");


const ROOT_PATH = path.join(__dirname, '..'); 
const PROTOS_PATH = path.join(ROOT_PATH, 'protos'); 
const GOOGLE_PROTOS = path.join(ROOT_PATH, 'node_modules/google-proto-files'); 
const PROTO_PACKAGE = "bareun";

module.exports = {
    default : {
        nlp_host : process.env.BAIKAL_NLP_HOST || "nlp.baikal.ai",
        nlp_port : process.env.BAIKAL_NLP_PORT || 5656
    },
    ROOT_PATH : ROOT_PATH,
    protos : {
        PROTOS_PATH : PROTOS_PATH,
        GOOGLE_PROTOS : GOOGLE_PROTOS,
        PROTO_PACKAGE : PROTO_PACKAGE,
        includeDirs: [GOOGLE_PROTOS, PROTOS_PATH, path.join(PROTOS_PATH,PROTO_PACKAGE)]
    }
}


