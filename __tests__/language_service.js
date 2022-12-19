
const SRC_DIR="../src/";

let LanguageServiceClient = require(SRC_DIR+"LanguageServiceClient.js");
let language_service_client = new LanguageServiceClient();
const conf = require(SRC_DIR+"config.js");
jest.setTimeout(30000);
console.log(">>>>>>> "+ language_service_client.remote + " test start.");

test("callback request for LanguageServiceClient", 
    (done) => {
    
        language_service_client.AnalyzeSyntax("아버지가 방에 들어가신다.",
          (error, res) => {
            if( error ) {
              expect(error).toBeNull(); 
              done(error);
              
              return;
            } 
            
            expect(res).not.toBeNull(); 
            console.log(JSON.stringify(res));
            done();
        }
        );
        
    } 
);



test("async request for LanguageServiceClient", 
  async () => {
    expect.assertions(1);
    try {  
      let res = await language_service_client.asyncAnalyzeSyntax("아버지가 방에 들어가신다.")
      expect(res).not.toBeNull();
    } catch(e) {
      console.log(e);
      expect(e).toBeNull();
    }     
  } 
);


