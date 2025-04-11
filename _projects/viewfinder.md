---
title: "Viewfinder"
date: 2023-12-01
layout: project
summary: "A psychogeographic video-sculpture exploring memory, surveillance, and spectral technology."
images:
  - /assets/images/projects/viewfinder/viewfinder-1.jpg
  - /assets/images/projects/viewfinder/viewfinder-2.jpg
links:
  - text: Watch Documentation
    url: https://vimeo.com/901186211
---

nature has been manipulated throughout the course of western civiliation to be packaged into consumable forms. originating in ideals of order and beauty, italian renaissance gardens were meant to idealize human dominion over the untamed wilderness. this compulsion to classify and control has evolved over time, culminating in our current era of surveillance that is swiftly automated and accelerated by ai object detection technology. extending to the digital sphere, both images and their referents are now reduced to categories. objects do not necessarily “exist.” our sense of the world is mediated through technology that was never meant to prize nuance or instinct.

—october 2024

{% if page.links %}
<ul>
  {% for link in page.links %}
    <li><a href="{{ link.url }}">{{ link.text }}</a></li>
  {% endfor %}
</ul>
{% endif %}