// Everflow browser-local Typst master.
// Calibrated from Everflow·彼时流年若水_TeXPage专用版_mixed-A4填写区上移版.zip

#let western = "TeX Gyre TermesX"
#let song = "FandolSong"
#let hei = "FandolHei"
#let kai = "FandolKai"
#let mathfont = "XITS Math"

#let page-total() = context counter(page).final().at(0)

#let fixed-overlay() = context {
  place(bottom + right, dx: -13mm, dy: -30mm)[
    #image("/assets/water.png", height: 34mm)
  ]
  place(bottom + left, dx: 3mm, dy: -5.8mm)[
    #stack(
      dir: ttb,
      spacing: 0.7mm,
      image("/assets/zuotiben-qr.svg", width: 13mm, height: 13mm),
      text(font: western, size: 5.8pt)[zuotiben.top],
    )
  ]
}

#let cover(title: "", date: "", kind: "exam") = {
  set page(width: 210mm, height: 297mm, margin: 0mm, header: none, footer: none, background: none, foreground: none)
  set text(fill: black)

  place(top + center, dy: 120.9mm)[
    #text(font: song, weight: "bold", size: if kind == "book" { 21.9178pt } else { 24.7871pt })[
      #title
    ]
  ]
  place(top + center, dy: 148.05mm)[
    #text(font: song, weight: "bold", size: 18.3313pt)[·彼时流年若水·]
  ]
  place(top + left, dx: 18mm, dy: 266mm)[
    #line(length: 50mm, stroke: 0.4pt)
  ]
  place(top + left, dx: 19.3mm, dy: 270.55mm)[
    #text(font: song, weight: "bold", size: 9.4645pt)[Everflow·彼时流年若水]
  ]
  place(top + left, dx: 19.3mm, dy: 277.15mm)[
    #text(
      font: song,
      weight: "bold",
      size: 8.9664pt,
      fill: if kind == "exam" { red } else { rgb("#24272b") },
    )[
      > > > 更新时间：#date
    ]
  ]
  pagebreak()
  counter(page).update(1)
}

#let exam-page() = {
  set page(
    width: 210mm,
    height: 297mm,
    margin: (top: 16mm, bottom: 12mm, left: 20mm, right: 20mm),
    header: none,
    footer: context {
      set text(font: (kai, western), size: 9pt)
      align(center)[第 #counter(page).display("1") 页（共 #page-total() 页）]
    },
    foreground: fixed-overlay(),
  )
  set text(font: (western, song), size: 9pt)
  set par(leading: 5.04pt)
}

#let book-page(center-header: "") = {
  set page(
    width: 210mm,
    height: 297mm,
    margin: (top: 14mm, bottom: 14mm, left: 18mm, right: 18mm),
    header: context {
      move(dy: -3mm)[
        #stack(
          dir: ttb,
          spacing: 1.2mm,
          grid(
            columns: (1fr, 1fr, 1fr),
            align(left)[#text(font: (western, song), weight: "bold", size: 10pt)[彼时流年若水]],
            align(center)[#text(font: (western, song), weight: "bold", size: 10pt)[#center-header]],
            align(right)[#text(font: western, weight: "bold", size: 10pt)[https://zuotiben.top]],
          ),
          line(length: 100%, stroke: 0.4pt),
        )
      ]
    },
    footer: context {
      set text(font: (western, song), size: 9pt)
      align(center)[·第 #counter(page).display("1") 页 / 共 #page-total() 页·]
    },
    foreground: fixed-overlay(),
  )
  set text(font: (western, song), size: 10.5pt)
  set par(leading: 5.88pt)
}

#let exam-group-title(body) = block(
  above: 1pt,
  below: 10.5pt,
  width: 100%,
)[
  #align(center)[#text(font: hei, weight: "bold", size: 16pt)[#body]]
]

#let exam-section(body) = block(
  above: 8.4pt,
  below: 4.2pt,
  width: 100%,
)[
  #align(left)[#text(font: hei, weight: "bold", size: 9pt)[#body]]
]

#let book-section(body) = block(
  above: 2pt,
  below: 4pt,
  width: 100%,
)[
  #align(center)[#text(font: hei, weight: "regular", size: 12pt)[#body]]
]

#let question(number, body, gap: 0pt, breakable: false) = block(
  breakable: breakable,
  below: gap,
  width: 100%,
)[
  #grid(
    columns: (2.25em, 1fr),
    column-gutter: 0.55em,
    align: (right, top),
    text(font: western)[#number.],
    body,
  )
]

#let choice-cell(label, body) = grid(
  columns: (2.25em, 1fr),
  column-gutter: 0em,
  align: (left, top),
  text(font: western)[(#label)],
  body,
)

#let choices(items) = block(
  above: 0.45em,
  inset: (left: 2.8em),
)[
  #layout(size => {
    let widths = items.enumerate().map(pair => {
      let i = pair.at(0)
      let item = pair.at(1)
      measure(choice-cell(char(65 + i), item)).width
    })
    let max-width = widths.fold(0pt, (a, b) => calc.max(a, b))
    let cols = if items.len() == 4 and max-width <= 22% * size.width {
      4
    } else if items.len() == 3 and max-width <= 22% * size.width {
      3
    } else if items.len() == 6 and max-width <= 22% * size.width {
      3
    } else if items.len() > 1 and max-width <= 46% * size.width {
      2
    } else {
      1
    }
    let columns = (1fr,) * cols
    grid(
      columns: columns,
      column-gutter: 1.2em,
      row-gutter: 0.22em,
      ..items.enumerate().map(pair => choice-cell(char(65 + pair.at(0)), pair.at(1))),
    )
  })
]

#let circled-line(label, body) = grid(
  columns: (2.2em, 1fr),
  column-gutter: 0.38em,
  align: (right, top),
  label,
  body,
)

#let roman-line(label, body) = grid(
  columns: (2.15em, 1fr),
  column-gutter: 0.35em,
  align: (right, top),
  label,
  body,
)

#let subq-line(label, body) = grid(
  columns: (1.9em, 1fr),
  column-gutter: 0.6em,
  align: (right, top),
  label,
  body,
)
