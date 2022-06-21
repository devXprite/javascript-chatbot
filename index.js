/* eslint-disable max-len */
const _ = require("lodash");
const convert = require("convert-units");
const extractValues = require("extract-values");
const stringSimilarity = require("string-similarity");
const { lowerCase } = require("lower-case");
const { upperCaseFirst } = require("upper-case-first");
const { capitalCase } = require("change-case");

const cors = require("cors");
const axios = require("axios");
const morgan = require("morgan");
const dotenv = require("dotenv");
const express = require("express");
const compression = require("compression");

const mainChat = require("./intents/Main_Chat.json");
const welcomeChat = require("./intents/Default_Welcome.json");
const fallbackChat = require("./intents/Default_Fallback.json");
const unitConverterChat = require("./intents/unit_converter.json");
const wikipediaChat = require("./intents/wikipedia.json");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allQustions = [];

for (let i = 0; i < mainChat.length; i++) {
  for (let j = 0; j < mainChat[i].questions.length; j++) {
    allQustions.push(mainChat[i].questions[j]);
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

const sendAnswer = async (req, res) => {
  let isFallback = false;
  let responseText = null;
  let rating = 0;
  let similarQuestion = null;
  let action = null;

  try {
    const query = decodeURIComponent(req.query.q).replace(/\s+/g, " ").trim() || "Hello";
    const humanInput = lowerCase(query.replace(/(\?|\.|!)$/gmi, ""));
    const regExforUnitConverter = /(convert|change|in).{1,2}(\d{1,8})/gmi;
    const regExforWikipedia = /(search for|tell me about|what is|who is)(?!.you) (.{1,30})/gmi;

    if (regExforUnitConverter.test(humanInput)) {
      const similarQuestionObj = stringSimilarity.findBestMatch(humanInput, unitConverterChat).bestMatch;
      similarQuestion = similarQuestionObj.target;
      const valuesObj = extractValues(humanInput, similarQuestion, {
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
        responseText = "One or more units are missing.";
        console.log(error);
      }
    } else if (regExforWikipedia.test(humanInput)) {
      const similarQuestionObj = stringSimilarity.findBestMatch(humanInput, wikipediaChat).bestMatch;
      similarQuestion = similarQuestionObj.target;
      const valuesObj = extractValues(humanInput, similarQuestion, {
        delimiters: ["{", "}"],
      });

      let { topic } = valuesObj;
      topic = capitalCase(topic);

      const wikipediaResponse = await axios(`https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=1&explaintext=1&titles=${topic}`);
      const wikipediaResponseData = wikipediaResponse.data;
      const wikipediaResponsePageNo = Object.keys(wikipediaResponseData.query.pages)[0];
      const wikipediaResponseText = wikipediaResponseData.query.pages[wikipediaResponsePageNo].extract;

      if (wikipediaResponseText == undefined || wikipediaResponseText == "") {
        responseText = `Sorry, we can't find any article related to "${topic}".`;
        isFallback = true;
      } else {
        responseText = wikipediaResponseText;
      }
    } else {
      const similarQuestionObj = stringSimilarity.findBestMatch(humanInput, allQustions).bestMatch;
      const similarQuestionRating = similarQuestionObj.rating;
      similarQuestion = similarQuestionObj.target;
      action = "main_chat";

      if (similarQuestionRating > 0.6) {
        for (let i = 0; i < mainChat.length; i++) {
          for (let j = 0; j < mainChat[i].questions.length; j++) {
            if (similarQuestion == mainChat[i].questions[j]) {
              responseText = _.sample(mainChat[i].answers);
              rating = similarQuestionRating;
            }
          }
        }
      } else {
        isFallback = true;
        action = "Default_Fallback";
        if (humanInput.length >= 5 && humanInput.length <= 20 && !/(\s{1,})/gmi.test(humanInput)) {
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
    console.log(error);
    if ((error.message).includes("URI")) {
      res.status(500).send({ error: error.message, code: 500 });
    } else {
      res.status(500).send({ error: "Internal Server Error!", code: 500 });
    }
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
