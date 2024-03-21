# Transition notes

Copmare that is the delta from the main theme to mine:

https://github.com/jonkeane/hugo-theme-massively-jtk/compare/91ff5ebfbcb8cf014ccabd567f95ab8812e2de12...jonkeane:hugo-theme-massively-jtk:a_new_start

first me commit: 810b32d0434ac830502e48ad697f3762c72b4802
last other commit: 91ff5ebfbcb8cf014ccabd567f95ab8812e2de12

Steps: go through those 66 files and see if the changes are good or not, but start from a base of the upstream. Try and put things in the layout over-flows.

Then start bumping

# TODO:
- [x] Remove the carousel entirely(?)
- [x] Add a shuffle button
- [x] Nav: remove contact? remove the first page? ~disappears on store~
- [x] layouts/index.html + _default (only for background image?) -> deleted
- [ ] PR passing context: {{ partial "htmlhead.custom.html" . }}
- [x] main.js is still overridden -> now have a custom.js
- [x] break points in scss
  - [x] box at top on mobile needs margin
  - [x] random album for today 
- [ ] move in-line style into an scss