const { addCommonProtos } = require("@grpc/proto-loader/build/src/util");

const SRC_DIR="../src/";

let Client = require(SRC_DIR+"BaikalLanguageServiceClient.js");
let Tagger = require(SRC_DIR+"Tagger.js");
const conf = require(SRC_DIR+"config.js");

jest.setTimeout(30000);

test("empty test",
() => expect(Client.emptyAnalyzeSyntaxResponse()).not.toBeNull()
);

let tagger = new Tagger();
let tagged_promise = tagger.tag("미친 세상에서 맨정신으로 산다는 건 힘든 일이다.");

test("Tagged pos()", async () => {
    expect.assertions(4);
    
    let tagged = await tagger.tag("미친 세상에서 맨정신으로 산다는 건 힘든 일이다.");
    
    const t=true, f=false;
    let obj;
    obj = tagged.pos(t, t, t);
    expect(obj).not.toBeNull();
    console.log("pos(t, t, t)"+JSON.stringify(obj));
    
    obj = tagged.pos(t, t, f);
    expect(obj).not.toBeNull();
    console.log("pos(t, t, f)"+JSON.stringify(obj));

    obj = tagged.pos(t, f, t);
    expect(obj).not.toBeNull();
    console.log("pos(t, f, t)"+JSON.stringify(obj));

    obj = tagged.pos(f, t, t);
    expect(obj).not.toBeNull();
    console.log("pos(f, t, t)"+JSON.stringify(obj));
    
} 
);


test("Tagged morphs()", async () => {
    expect.assertions(3);

    let tagged = await tagger.tag("미친 세상에서 맨정신으로 산다는 건 힘든 일이다.");
    obj = tagged.morphs();
    expect(obj).not.toBeNull();
    console.log("morphs()"+JSON.stringify(obj));

    obj = tagged.nouns();
    expect(obj).not.toBeNull();
    console.log("nouns()"+JSON.stringify(obj));

    obj = tagged.verbs();
    expect(obj).not.toBeNull();
    console.log("verbs()"+JSON.stringify(obj));

});