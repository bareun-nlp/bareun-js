# bareun 

# What is this?

`bareun` is the javascript library for bareun.

Bareun is a Korean NLP,
which provides tokenizing, POS tagging for Korean.


## Installation

This is a [Node.js](https://nodejs.org/) module available through the 
[npm registry](https://www.npmjs.com/). It can be installed using the 
[`npm`](https://docs.npmjs.com/getting-started/installing-npm-packages-locally)
or 
[`yarn`](https://yarnpkg.com/en/)
command line tools.

```sh
npm install bareun --save
```

## How to get bareun server 
- Go to https://bareun.ai/.
  - With registration, for the first time, you can get a free license for 3 months.
  - If you are a student or a researcher, you can get also a free license for 1 year,
    which is able to renew after 1 year.
- Or use docker image.
```shell
docker pull bareunai/bareun:latest
```


## Envrionment values
- BAREUN_HOST : Default address of NLP server ( default: "nlp.bareun.ai" )
- BAREUN_PORT : Default port of NLP server ( default: 5656 )
- you can set this ENV values in the .env file in your project root directory.

## classes 

### class LanguageServiceClient
#### Methods
##### constructor(remote=null) 
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:| 
| remote | String | host + ":" + port. ex)"nlp.bareun.ai:5656". |

##### AnalyzeSyntax( text, domain = null, auto_split = false, callback = null )
Analyze text.
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| text | String | | 
| domain | String | domain custom dictionary name. |
| auto_split | Boolean | |
| callback | Function(error, response) | |

##### async asyncAnalyzeSyntax(text, domain = null, auto_split = false )
Analyze text.
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| text | String | | 
| domain | String | domain custom dictionary name. |
| auto_split | Boolean | |
###### Returns:
Object&lt;AnalyzeSyntaxResponse&gt; AnalyzeSyntaxResponse object.

### class Tagger
#### Methods
###### constructor(host="nlp.bareun.ai", port=5656, domain=null)
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| host | String | NLP server address. default: ENV BAREUN_HOST or "nlp.bareun.ai" |
| port | Integer | NLP server port. default: ENV BAREUN_PORT or 5656 |
| domain | String | domain custom dictionary name. |

##### set_domain(domain)
Set current domain custom dictionary name.
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| domain | String | domain custom dictionary name. |


##### custom_dict(domain)
Get custom dictionary 
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| domain | String | domain custom dictionary name. |
###### Returns:
Object&lt;CustomDict&gt; Custom dictionary object.

##### async tag(phrase, auto_split = false)
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| phrase | String | |
| auto_split | Boolean |
###### Returns:
Object&lt;Tagged&gt; Tagged object.

##### async pos(phrase, flatten = true, join=false, detail=false)
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| phrase | String | |
| flatten | Boolean | |
| join | Boolean | |
| detail | Boolean | |
###### Returns:
Array&lt;Any&gt; 

##### async morphs(phrase) 
Get morphs array of phrase.
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| phrase | String | |
###### Returns:
Array&lt;String&gt; String array.

##### async nouns(phrase) 
Get nouns array of phrase.
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| phrase | String | |
###### Returns:
Array&lt;String&gt; String array.

##### async verbs(phrase) 
Get verbs array of phrase.
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| phrase | String | |
###### Returns:
Array&lt;String&gt; String array.


### class Tagged
#### Methods
##### constructor(phrase, res)
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| phrase | String | |
| res | Object&lt;AnalyzeSyntaxResponse&gt; | AnalyzeSyntaxResponse object |

##### msg()
Get AnalyzeSyntaxResponse object
###### Returns:
Object&lt;AnalyzeSyntaxResponse&gt; AnalyzeSyntaxResponse object.

##### as_json_str(beauty  = false)
Get json string for AnalyzeSyntaxResponse object
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| beauty | Boolean | |

##### print_as_json(out = console) 
Print json string for AnalyzeSyntaxResponse object
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| out | console, Object&lt;Stream&gt; | |

##### pos(phrase, flatten = true, join=false, detail=false)
###### Parameters:
| Name | Type | Description |
|---|:---:|:---:|
| flatten | Boolean | |
| join | Boolean | |
| detail | Boolean | |
###### Returns:
Array&lt;Any&gt; 

##### morphs() 
Get morphs array of phrase.
###### Returns:
Array&lt;String&gt; String array.

##### nouns() 
Get nouns array of phrase.
###### Returns:
Array&lt;String&gt; String array.

##### verbs()
Get verbs array of phrase.
###### Returns:
Array&lt;String&gt; String array.


## How to use
```
    let host="nlp.bareun.ai"
    let {LanguageServiceClient, Tagger, CustomDict}  = require("bareun");
    let language_service_client = new LanguageServiceClient(host);

    language_service_client.AnalyzeSyntax("아버지가 방에 들어가신다.",
        (error, res) => {
            console.log('result : language_service_client.AnalyzeSyntax("아버지가 방에 들어가신다.")');
            if( error ) {            
                throw error;            
                return;
            }                 
            console.log(JSON.stringify(res));        
        }
    );

    (async () => {
      try {  
          let res = await language_service_client.asyncAnalyzeSyntax("아버지가 방에 들어가신다.")        
          console.log(JSON.stringify(res));    
      } catch(e) {
          console.log(e);       
      } 
    })();

    
    let tagged = await tagger.tag("미친 세상에서 맨정신으로 산다는 건 힘든 일이다.");
    (async () => {
        const t=true, f=false;
        let obj;
        obj = tagged.pos(t, t, t);
        console.log("pos(t, t, t)"+JSON.stringify(obj));
        
        obj = tagged.pos(t, t, f);
        console.log("pos(t, t, f)"+JSON.stringify(obj));

        obj = tagged.pos(t, f, t);
        console.log("pos(t, f, t)"+JSON.stringify(obj));

        obj = tagged.pos(f, t, t);
        console.log("pos(f, t, t)"+JSON.stringify(obj));

        obj = tagged.morphs();
        console.log("morphs()"+JSON.stringify(obj));

        obj = tagged.nouns();
        console.log("nouns()"+JSON.stringify(obj));

        obj = tagged.verbs();
        console.log("verbs()"+JSON.stringify(obj));
    })(); 


    let dict = new CustomDict("game", host);

    (async () => {
        let set = new Set(["지지", "캐리", "던전", "현피", "세계관", "만렙","어그로","치트키","퀘스트","본캐","로밍","방사","딜러","버스","사플" ] );
        dict.copy_cp_set(set);

        let success = await dict.update();
        console.log("result :  dict.update() - " + success);
        
        await dict.read_np_set_from_file(__dirname + "/game_dict.txt");
        console.log("result :  dict.load() - " + JSON.stringify([...dict.word_sets.np_set]));   
        let success = await dict.update();
        console.log("result :  dict.update() - " + success);     

        let res = await dict.client.async_get_list();
        console.log("async_get_list() : " + JSON.stringify(res, null, 2));

        await dict.load();

        let res = await dict.clear();
        console.log("clear() : " + JSON.stringify(res, null, 2));
    })();
```

## License

BSD 3-Clause License
