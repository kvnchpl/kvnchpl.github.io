---
layout: default
title: home
description: Portfolio and brain dump for kevin cunanan chappelle, creator of multimedia projects and performances. Based in New York City.
permalink: /
---

<h1>kevin cunanan chappelle</h1>

<ul class="link-list">
  {% for link in site.data.index %}
    <li>
      <a href="{{ link.href }}" 
         {% if link.href == page.url %}aria-current="page"{% endif %}
         {% if link.newTab == false %}target="_self"{% elsif link.href contains 'http' %}target="_blank" rel="noopener noreferrer"{% endif %}>
        {{ link.label }}
      </a>
    </li>
  {% endfor %}
</ul>