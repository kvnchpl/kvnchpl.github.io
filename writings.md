---
layout: default
title: Writings
description: See what I'm writing.
permalink: /writings/
---

<h1>Writings</h1>
<ul>
  {% for writing in site.writings %}
    <li>
      <a href="{{ writing.url }}">{{ writing.title }}</a> - {{ writing.summary }}
    </li>
  {% endfor %}
</ul>