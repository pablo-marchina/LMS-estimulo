# Participant lesson layout root cause

When a completed lesson was selected inside a journey, the browser resolved the journey root grid into two columns (`762.5px 323.5px`) even though the page source did not explicitly declare a two-column layout. The lesson occupied the first implicit column while the journey hero and learning-path section were placed in the second, producing the large blank region and narrow cover seen in production.

The durable fix is to make the intended layout explicit: the journey root declares a single `grid-cols-1` track and its structural children use `min-w-0`. The visual composition gate verifies that hero, learning path and selected lesson share the same left edge and natural content width in desktop and mobile.
