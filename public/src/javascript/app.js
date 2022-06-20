// submit form
const submitForm = () => {
  const chatInput = $(".chat-input").val();

  $("main").append(`
  <div class="chat-msg-box clint">
    <p>${chatInput}</p>
  </div>
  `);

  $.ajax({
    url: `https://javascript-chatbot.vercel.app/api/question/?q=${encodeURIComponent(chatInput)}`,
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
      const response = (data.responseText).replace("\n", "</br>");
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

$.ajax();

$("#chat-form").submit((e) => {
  e.preventDefault();
  submitForm();
});
