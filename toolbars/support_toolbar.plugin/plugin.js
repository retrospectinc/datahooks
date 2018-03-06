
$(document).ready(function() {
  $(".toolbar a.support").click(function() {
    var url = $(this).attr('href');
    window.server.openURL(url);
    return false;
  });
});
