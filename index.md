---
layout: default
title: KEVIN CUNANAN CHAPPELLE :)
description: Portfolio and brain dump for Kevin Cunanan Chappelle, creator of multimedia projects and performances. Based in New York City.
permalink: /
---

<h1>Kevin Cunanan Chappelle :)</h1>

<div id="link-container">
  <ul>
    {% for link in site.data.index %}
      <li class="row">
        <a href="{{ link.href }}" 
           {% if link.href == page.url %}aria-current="page"{% endif %}
           {% if link.newTab == false %}target="_self"{% elsif link.href contains 'http' %}target="_blank" rel="noopener noreferrer"{% endif %}>
          {{ link.label }}
        </a>
      </li>
    {% endfor %}
  </ul>
</div>