[35mBasmahLibrary.Web/supabase/schema.sql[m[36m:[m[32m3[m[36m:[m-- ملاحظة: [1;31mservice_role[m key لا يوضع أبداً في GitHub أو JavaScript.
[35mBasmahLibrary.Web/wwwroot/admin.html[m[36m:[m[32m92[m[36m:[m            <input id="admin[1;31mPassword[m"
[35mBasmahLibrary.Web/wwwroot/admin.html[m[36m:[m[32m93[m[36m:[m                   type="[1;31mpassword[m"
[35mBasmahLibrary.Web/wwwroot/admin.html[m[36m:[m[32m95[m[36m:[m                   autocomplete="current-[1;31mpassword[m">
[35mBasmahLibrary.Web/wwwroot/assets/js/admin.js[m[36m:[m[32m1339[m[36m:[m    const [1;31mpassword[m =
[35mBasmahLibrary.Web/wwwroot/assets/js/admin.js[m[36m:[m[32m1340[m[36m:[m        $("#admin[1;31mPassword[m")
[35mBasmahLibrary.Web/wwwroot/assets/js/admin.js[m[36m:[m[32m1344[m[36m:[m    if (!email || ![1;31mpassword[m) {
[35mBasmahLibrary.Web/wwwroot/assets/js/admin.js[m[36m:[m[32m1365[m[36m:[m            .signInWith[1;31mPassword[m({
[35mBasmahLibrary.Web/wwwroot/assets/js/admin.js[m[36m:[m[32m1367[m[36m:[m                [1;31mpassword[m
[35mBasmahLibrary.Web/wwwroot/assets/js/admin.js[m[36m:[m[32m1483[m[36m:[m$("#admin[1;31mPassword[m")
[35mBasmahLibrary.Web/wwwroot/assets/js/config.example.js[m[36m:[m[32m2[m[36m:[m// مهم: anon/publishable key ممكن يظهر في الواجهة. ممنوع تماماً وضع [1;31mservice_role[m key هنا.
