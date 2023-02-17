
module.exports.LanguageServiceClient = require("./LanguageServiceClient.js");
module.exports.CustomDictionaryServiceClient = require("./CustomDictionaryServiceClient.js")
module.exports.Tagger = require("./Tagger.js")
module.exports.CustomDict = require("./CustomDict.js")

let LanguageServiceClient = require("./LanguageServiceClient.js")
let language_service_client = new LanguageServiceClient("nlp.bareun.ai","koba-99CAAKC-UPDS66A-QR9QPVF-0AYPOCA");

async function test() {
    try {  
        let res = await language_service_client.asyncAnalyzeSyntax("아버지가 방에 들어가신다.")
        console.log('result : language_service_client.asyncAnalyzeSyntax("아버지가 방에 들어가신다.")');
        console.log(JSON.stringify(res));    
    } catch(e) {
        console.log(e);       
    } 
}

test();
