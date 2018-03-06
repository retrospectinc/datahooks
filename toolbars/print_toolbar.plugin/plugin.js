
$(document).ready(function() {
  $(".toolbar a.print").click(function() {
    window.server.printDashboard();
    return false;
  });
});
