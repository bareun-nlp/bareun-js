const path = require("path");
const SRC_DIR="../src/";

let CustomDict = require(SRC_DIR+"CustomDict.js");
const conf = require(SRC_DIR+"config.js");

let dict = new CustomDict("game");
jest.setTimeout(30000);

test("update test", async () =>{
    expect.assertions(1);
    let set = new Set(["지지", "캐리", "던전", "현피", "세계관", "만렙","어그로","치트키","퀘스트","본캐","로밍","방사","딜러","버스","사플" ] );
    dict.copy_cp_set(set);

    let success = await dict.update();
    expect(success).toBe(true);
})

test("load test ", async () => {
    expect.assertions(1);
    //console.log(dict.np_set);
    await dict.load();
    // console.log("dict.np_set" + JSON.stringify(dict.np_set.keys()));
    expect(dict.word_sets.cp_set.size).toBeGreaterThan(0);
});

test("read np set from file", async () => {
    expect.assertions(1);
    //console.log(dict.np_set);
    await dict.read_np_set_from_file(__dirname + "/game_dict.txt");
    // console.log("dict.np_set" + JSON.stringify(dict.np_set.keys()));
    expect(dict.word_sets.np_set.size).toBeGreaterThan(0);
});




test("get list custom domains", async () => {
    expect.assertions(1);
    let res = await dict.client.async_get_list();
    console.log("async_get_list() : " + JSON.stringify(res, null, 2));
    expect(res).not.toBeNull();
})

test("clear", async () => {
    expect.assertions(1);
    let res = await dict.clear();
    console.log("clear() : " + JSON.stringify(res, null, 2));
    expect(res).not.toBeNull();
})
