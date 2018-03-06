
$(document).ready(function() {
  $(".toolbar a.relaunch").click(function() {
     window.server.relaunchRetrospect();
     $(".restarting").show();
     return false;
  });
});
