/* eslint-disable no-unused-vars */
// submit form
const submitForm = () => {
  const chatInput = $(".chat-input").val();

  $("main").append(`
  <div class="chat-msg-box clint">
    <p>${chatInput}</p>
  </div>
  `);

  $.ajax({
    url: `./api/question/?q=${encodeURIComponent(chatInput)}`,
    method: "GET",
    cache: false,
    beforeSend: () => {
      $(".chat-input").val("");
      $(".typing").show();
      $("main").append(`
        <div class="chat-msg-box bot">
          <div class="spinner">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
          </div>
        </div>
        `);
      $([document.documentElement, document.body]).animate({
        scrollTop: $(".chat-msg-box.bot:last-child").offset().top,
      }, { duration: 500 });
    },
    success: (data) => {
      const response = (data.responseText).replace(/\n/gm, "</br>");
      $(".chat-msg-box.bot:last-child").html(`<p>${response}</p>`);
    },
    error: () => {
      $(".chat-msg-box.bot:last-child").remove();
    },
    complete: () => {
      $(".typing").hide();
    },
  });
};

window.onload = () => {
  setTimeout(() => {
    if (document.querySelectorAll(".chat-msg-box").length == 0) {
      $.ajax({
        url: "./api/welcome",
        beforeSend: () => {
          $(".typing").show();
          $("main").append(`
            <div class="chat-msg-box bot">
              <div class="spinner">
                <div class="bounce1"></div>
                <div class="bounce2"></div>
                <div class="bounce3"></div>
              </div>
            </div>
            `);
          $([document.documentElement, document.body]).animate({
            scrollTop: $(".chat-msg-box.bot:last-child").offset().top,
          }, { duration: 500 });
        },
        success: (data) => {
          const response = (data.responseText).replace(/\n/gm, "</br>");
          $(".chat-msg-box.bot:last-child").html(`<p>${response}</p>`);
        },
        error: () => {
          $(".chat-msg-box.bot:last-child").remove();
        },
        complete: () => {
          $(".typing").hide();
        },
      });
    }
  }, 3000);

  $.ajax({
    url: "http://javascript-chatbot.vercel.app/api/allquestions",
    success: (data) => {
      data.forEach((qus) => {
        $(".questions.container").append(`
        <div class="question">
          <p>${qus}</p>
        </div>
        `);
      });
    },
  });
};

window.onresize = () => {
  if (window.innerHeight < 580) {
    $("header").css("top", "-4em");
  } else {
    $("header").css("top", "0vh");
  }
};

const toogleShowQuestions = () => {
  if ($("main").css("display") == "none") {
    $(".questions.container").hide();
    $("header img").attr("src", "./src/images/chat_icon.png");
    $("main").show();
    $("footer").show();
  } else {
    $(".questions.container").css("display", "flex");
    $("header img").attr("src", "./src/images/close.png");
    $("main").hide();
    $("footer").hide();
  }
};

$("#toogle-chat").on("click", () => {
  toogleShowQuestions();
});

$("#chat-form").submit((e) => {
  e.preventDefault();
  submitForm();
});
