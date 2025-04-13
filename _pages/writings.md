---
layout: default
title: writings
description: A collection of writings by Kevin Cunanan Chappelle.
permalink: /writings/
---

<h1>Writings</h1>

<div id="link-container">
  {% for writing in site.writings %}
    <div class="row">
      <div class="link-wrapper">
        <a href="{{ writing.url }}">
          {{ writing.title }}
        </a>
        {% if writing.date %}
          <span class="subtitle">Published on {{ writing.date | date: "%B %d, %Y" }}</span>
        {% endif %}
      </div>
    </div>
  {% endfor %}
</div>