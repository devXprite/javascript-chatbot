/* eslint-disable max-len */
const _ = require("lodash");
const convert = require("convert-units");
const { lowerCase } = require("lower-case");
const extractValues = require("extract-values");
const stringSimilarity = require("string-similarity");
const { upperCaseFirst } = require("upper-case-first");

const cors = require("cors");
const morgan = require("morgan");
const express = require("express");
const compression = require("compression");

const mainChat = require("./intents/Main_Chat.json");
const welcomeChat = require("./intents/Default_Welcome.json");
const fallbackChat = require("./intents/Default_Fallback.json");
const unitConverterChat = require("./intents/unit_converter.json");

const app = express();
const port = process.env.PORT || 3000;

const allQustions = [];

for (let i = 0; i < mainChat.length; i++) {
  for (let j = 0; j < mainChat[i].qus.length; j++) {
    allQustions.push(mainChat[i].qus[j]);
  }
}

for (let i = 0; i < unitConverterChat.length; i++) {
  allQustions.push(unitConverterChat[i].replace("{amount}", 10).replace("{unitFrom}", "cm").replace("{unitTo}", "mm"));
}

const changeUnit = (amount, unitFrom, unitTo) => {
  try {
    const convertValue = convert(amount).from(unitFrom).to(unitTo);
    const returnMsg = `${amount} ${convert().describe(unitFrom).plural}(${convert().describe(unitFrom).abbr}) is equle to ${convertValue} ${convert().describe(unitTo).plural}(${convert().describe(unitTo).abbr}).`;

    return returnMsg;
  } catch (error) {
    return (error.message);
  }
};

const sendAllQuestions = (req, res) => {
  const humanQuestions = [];

  try {
    allQustions.forEach((qus) => {
      if (qus.length >= 10) {
        if (/^(can|are|may|how|what|when|who|do|where|your|from|is|will|why)/gi.test(qus)) {
          humanQuestions.push(`${upperCaseFirst(qus)}?`);
        } else {
          humanQuestions.push(`${upperCaseFirst(qus)}.`);
        }
      }
    });
    res.json(_.shuffle(humanQuestions));
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error!", code: 500 });
    console.log(error);
  }
};

const sendWelcomeMessage = (req, res) => {
  res.json({
    responseText: _.sample(welcomeChat),
  });
};

const sendAnswer = (req, res) => {
  let isFallback = false;
  let responseText = null;
  let rating = 0;
  let similarQuestion = null;
  let action = null;

  try {
    const query = decodeURIComponent(req.query.q).replace(/\s+/g, " ").trim() || "Hello";
    const humanInput = lowerCase(query.replace(/(\?|\.|!)$/gmi, ""));
    const regExforUnitConverter = /(convert|change|in).{1,2}(\d{1,8})/gmi;

    if (regExforUnitConverter.test(humanInput)) {
      const similarQuestionObj = stringSimilarity.findBestMatch(humanInput, unitConverterChat).bestMatch;
      const valuesObj = extractValues(humanInput, similarQuestionObj.target, {
        delimiters: ["{", "}"],
      });

      rating = 1;
      action = "unit_converter";

      try {
        const {
          amount,
          unitFrom,
          unitTo,
        } = valuesObj;

        responseText = changeUnit(amount, unitFrom, unitTo);
      } catch (error) {
        responseText = "One or more unit missing.";
        console.log(error);
      }
    } else {
      const similarQuestionObj = stringSimilarity.findBestMatch(humanInput, allQustions).bestMatch;
      const similarQuestionRating = similarQuestionObj.rating;
      similarQuestion = similarQuestionObj.target;
      action = "main_chat";

      if (similarQuestionRating > 0.5) {
        for (let i = 0; i < mainChat.length; i++) {
          for (let j = 0; j < mainChat[i].qus.length; j++) {
            if (similarQuestion == mainChat[i].qus[j]) {
              responseText = _.sample(mainChat[i].ans);
              rating = similarQuestionRating;
            }
          }
        }
      } else {
        isFallback = true;
        if (humanInput.length <= 20 && !/(\s{1,})/gmi.test(humanInput)) {
          responseText = "You are probably hitting random keys :D";
        } else {
          responseText = _.sample(fallbackChat);
        }
      }
    }

    res.json({
      responseText,
      query,
      rating,
      action,
      isFallback,
      similarQuestion,
    });
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error!", code: 500 });
    console.log(error);
  }
};

app.use(cors());
app.use(compression());
app.set("json spaces", 4);
app.use("/api/*", morgan("tiny"));
app.get("/api/question", sendAnswer);
app.get("/api/welcome", sendWelcomeMessage);
app.get("/api/allQuestions", sendAllQuestions);

app.listen(port, () => console.log(`app listening on port ${port}!`));
