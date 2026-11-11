/* ==========================================================================
   MAM quiz — the Australian page (data-market="AU")

   Budget answers in AUD (the brackets of the moveaheadmedia.com.au enquiry
   form), the lead's budget field named and written like that form's, and
   the plan for a budget unchanged. tests/run-node.mjs runs this with a page
   whose <html data-market="AU">; load after config.js, data.js, engine.js
   and planner.js.
   ========================================================================== */
(function (root) {
  "use strict";

  var CFG = root.MAM_CONFIG;
  var D = root.MAM_DATA;
  var E = root.MAM_ENGINE;
  var P = root.MAM_PLANNER;
  var tests = [];
  var passed = 0;
  var failed = 0;

  function writeLine(message) {
    if (typeof print === "function") print(message);
    else if (root.console && root.console.log) root.console.log(message);
  }
  function test(name, fn) { tests.push({ name: name, fn: fn }); }
  function assert(condition, message) { if (!condition) throw new Error(message || "Assertion failed"); }
  function same(actual, expected, message) {
    var a = JSON.stringify(actual);
    var e = JSON.stringify(expected);
    if (a !== e) throw new Error((message ? message + ": " : "") + "got " + a + ", expected " + e);
  }

  function budgetOptions() {
    return D.QUESTIONS.filter(function (q) { return q.id === "budget"; })[0].options;
  }

  var ANSWERS = { profile: "sme", type: "local", budget: "50to100", objective: "leads", challenge: ["ranking", "ai"] };

  function payload() {
    var result = P.plan(ANSWERS);
    var p = P.buildPayload(ANSWERS, { name: "Test", email: "test@example.com", phone: "0412 345 678", website: "" },
      result, Date.now(), { signals: {} });
    p.language = "en";
    p.market = CFG.market;
    p.meta.page_url = "https://www.moveaheadmedia.com.au/quiz/";
    return p;
  }

  test("this is the Australian page", function () {
    same([CFG.market, CFG.currency], ["AU", "AUD"]);
  });

  test("the budget answers are the AU website form's brackets, in AUD", function () {
    same(budgetOptions().map(function (o) { return [o.id, o.label]; }), [
      ["under50", "500 – 1,000 AUD"],
      ["50to100", "1,001 – 2,000 AUD"],
      ["100to300", "2,001 – 3,000 AUD"],
      ["over300", "Over 3,000 AUD"],
      ["unsure", "I'm not sure yet"],
    ]);
    budgetOptions().forEach(function (o) { assert(!/THB/.test(o.label + o.desc), o.id + " still says THB"); });
  });

  test("the lead's budget is named and written like the AU website form's", function () {
    var fields = E.formFields(payload(), {});
    same(fields["_Monthly Project Budget (AUD)"], "1,001 - 2,000 AUD");
    assert(!("_Monthly Project Budget (THB)" in fields), "a THB budget field is still sent");
    same(fields["_Country Code"], "+61");
  });

  test("the quiz payload carries the AUD wording too", function () {
    same(payload().answers.budget, { id: "50to100", label: "1,001 – 2,000 AUD" });
  });

  test("the plan for a budget is the same as on the Thai site", function () {
    var result = P.plan(ANSWERS);
    same([result.primaries, result.supporting], [["google-ads-campaigns", "seo-campaigns"], ["facebook-ads"]]);
  });

  tests.forEach(function (item) {
    try { item.fn(); passed++; writeLine("PASS " + item.name); }
    catch (error) { failed++; writeLine("FAIL " + item.name + "\n      " + (error && error.message)); }
  });
  writeLine("\nRESULT " + passed + " passed, " + failed + " failed");
  if (root.process && typeof root.process === "object") {
    root.process.exitCode = failed ? 1 : (root.process.exitCode || 0);
  } else if (failed) {
    throw new Error(failed + " failed");
  }
})(typeof window !== "undefined" ? window : this);
