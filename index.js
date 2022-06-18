const MainChat = require("./intents/Main_Chat.json");
const WelcomeChat = require("./intents/Default_Welcome.json");
const FallbackChat = require("./intents/Default_Fallback.json");
const unitConverterChat = require("./intents/unit_converter.json").qus;

const stringSimilarity = require("string-similarity");
const _ = require('lodash');
const { upperCaseFirst } = require("upper-case-first");
const extractValues = require("extract-values");

const cors = require("cors");
const express = require("express");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const app = express();
const port = process.env.PORT || 3000;

var allQustions = [];
var answer = {};
var humanInput = "how are you";

for (let i = 0; i < MainChat.length; i++) {
  for (let j = 0; j < MainChat[i]["qus"].length; j++) {
    allQustions.push(MainChat[i]["qus"][j])
  }
}

const sendAllQuestions = (req, res) => {
  var humanQuestions = [];

  allQustions.forEach(qus => {
    if (qus.length >= 10) {
      if (/^(can|are|may|how|what|when|who|do|where|your|from|is|will|why)/gi.test(qus)) {
        humanQuestions.push(upperCaseFirst(qus) + "?");
      } else {
        humanQuestions.push(upperCaseFirst(qus) + '.');
      }
    }
  });
  res.json(_.shuffle(humanQuestions))
}

const sendWelcomeMessage = (req, res) => {
  res.json({ responseText: _.sample(WelcomeChat) })
}

const sendAnswer = (req, res) => {

  var isFallback = false;
  var responseText = 'n/a';
  var rating = 0;
  var similarQuestion = 'n/a';
  var action;

  let query = req.query.q;
  let humanInput = query.replace(/(\?|\.)$/gm, "v");
  let regExforUnitConverter = /(convert|change).{1,2}(\d{1,8})/gm;

  if (regExforUnitConverter.test(humanInput)) {

    let similarQuestionObj = stringSimilarity.findBestMatch(humanInput, unitConverterChat).bestMatch;
    let valuesObj = extractValues(humanInput, similarQuestionObj.target, { delimiters: ["%", "%"] });

    const { amount, unit_from, unit_to } = valuesObj;
    console.log(amount, unit_from, unit_to);

  } else {

    let similarQuestionObj = stringSimilarity.findBestMatch(humanInput, allQustions).bestMatch;
    let similarQuestionRating = similarQuestionObj.rating;
    similarQuestion = similarQuestionObj.target;

    if (similarQuestionRating > 0.5) {
      for (let i = 0; i < MainChat.length; i++) {
        for (let j = 0; j < MainChat[i]["qus"].length; j++) {
          if (similarQuestion == MainChat[i]["qus"][j]) {
            responseText = _.sample(MainChat[i]["ans"]);
            rating = similarQuestionRating;
          }
        }
      }
    } else {
      responseText = _.sample(FallbackChat);
      isFallback = true;
    }
  }

  res.json({
    responseText,
    rating,
    similarQuestion,
    isFallback
  });
}

app.use(cors());
app.use(compression());
app.use("/api/*", morgan("tiny"));
app.get("/api/allQuestions", sendAllQuestions);
app.get("/api/welcome", sendWelcomeMessage);
app.get("/api/question", sendAnswer);

app.listen(port, () => console.log(`app listening on port ${port}!`));