# TODO:
- [ ] Remove the carousel entirely(?)
- [ ] Figure out why nav is broken
- [ ] PR passing context: {{ partial "htmlhead.custom.html" . }}
- [ ] main.js is still overridden

# Edit
- [x] README.md
- [x] theme.toml (probably can ignore or not change)
- [x] static/assets/css/main.css (or transition out + override?)
- [ ] static/assets/js/main.js  (or transition out + override?)
- [x] static/assets/sass/libs/_vars.scss

# Transition to override
But still need to figure out which can be re-integrated.
- [x] layouts/_default/list.html
- [x] layouts/_default/single.html
- [x] layouts/gallery/list.html
- [x] layouts/gallery/single.html
- [x] layouts/index.html
- [x] layouts/partials/bg.html
- [x] layouts/partials/colophon.html
- [x] layouts/partials/copyright.html (this is deleted from the original and renamed colophon, maybe change it back?)
- [x] layouts/partials/footer/index.html
- [x] layouts/partials/gallerys/featured.html
- [x] layouts/partials/gallerys/list.html
- [x] layouts/partials/gallerys/pagination.html
- [x] layouts/partials/htmlhead.html
- [x] layouts/partials/nav.html
- [x] layouts/partials/opengraph.html
- [x] layouts/partials/posts/featured.html
- [x] layouts/partials/posts/list.html
- [x] layouts/partials/scripts/index.html
- [x] layouts/partials/slider.html
- [x] layouts/partials/twitter_cards.html


# Transition to override definitively
- [x] i18n/en.toml
- [x] static/assets/css/bootstrap-grid.css
- [x] static/assets/css/bootstrap-grid.css.map
- [x] static/assets/css/bootstrap-grid.min.css
- [x] static/assets/css/bootstrap-grid.min.css.map
- [x] static/assets/css/bootstrap-reboot.css
- [x] static/assets/css/bootstrap-reboot.css.map
- [x] static/assets/css/bootstrap-reboot.min.css
- [x] static/assets/css/bootstrap-reboot.min.css.map
- [x] static/assets/css/bootstrap.css
- [x] static/assets/css/bootstrap.css.map
- [x] static/assets/css/bootstrap.min.css
- [x] static/assets/css/bootstrap.min.css.map
- [x] static/assets/css/customizations.css
- [x] static/assets/css/font/.htaccess (delete?)
- [x] static/assets/css/font/ngy2_icon_font.woff
- [x] static/assets/css/font/ngy2_icon_font.woff2
- [x] static/assets/css/nanogallery2.min.css
- [x] static/assets/css/nanogallery2.woff.min.css
- [x] static/assets/css/type/azuro-bold.eot
- [x] static/assets/css/type/azuro-bold.woff
- [x] static/assets/css/type/azuro-bolditalic.eot
- [x] static/assets/css/type/azuro-bolditalic.woff
- [x] static/assets/css/type/azuro-italic.eot
- [x] static/assets/css/type/azuro-italic.woff
- [x] static/assets/css/type/azuro-regular.eot
- [x] static/assets/css/type/azuro-regular.woff
- [x] static/assets/js/bootstrap.bundle.js
- [x] static/assets/js/bootstrap.bundle.js.map
- [x] static/assets/js/bootstrap.bundle.min.js
- [x] static/assets/js/bootstrap.bundle.min.js.map
- [x] static/assets/js/bootstrap.js
- [x] static/assets/js/bootstrap.js.map
- [x] static/assets/js/bootstrap.min.js
- [x] static/assets/js/bootstrap.min.js.map
- [x] static/assets/js/nanogallery2/README.md
- [x] static/assets/js/nanogallery2/jquery.nanogallery2.js
- [x] static/assets/js/nanogallery2/jquery.nanogallery2.min.js
- [x] static/assets/js/jquery.bcSwipe.js (remove? no carosel?)
- [x] static/assets/js/jquery.bcSwipe.min.js (remove? no carosel?)

# Delete / remove
- [x] .gitignore
- [x] static/assets/css/jtk_main.css
- [x] static/assets/css/main_old.css