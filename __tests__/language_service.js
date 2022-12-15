
const SRC_DIR="../src/";

let BaikalLanguageServiceClient = require(SRC_DIR+"BaikalLanguageServiceClient.js");
let language_service_client = new BaikalLanguageServiceClient();
const conf = require(SRC_DIR+"config.js");

test("env test",
() => expect(conf.default.nlp_host).toEqual("localhost")
);

test("callback request for BaikalLanguageServiceClient", 
  (done) => {
  
      language_service_client.AnalyzeSyntax("아버지가 방에 들어가신다.")
        .error( (err) => {
            done(err);      
          }
        )
        .done( (res) => {
          expect(res).not.toBeNull(); 
          console.log(JSON.stringify(res));
          done();         
        }); 
  } 
);



test("async request for BaikalLanguageServiceClient", 
  async () => {  
    let [err, res] = await language_service_client.asyncAnalyzeSyntax("아버지가 방에 들어가신다.")
    expect(err).toBeNull();      
  } 
);

