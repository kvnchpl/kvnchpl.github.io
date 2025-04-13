---
layout: default
title: readings
description: A curated list of readings by Kevin Cunanan Chappelle.
permalink: /readings/
---

<h1>Readings</h1>

<div id="link-container">
  <ul>
    {% for reading in site.data.readings %}
      <li class="row">
        <a href="{{ reading.link }}" target="_blank" rel="noopener noreferrer">
          {{ reading.title }}
        </a>
        {% if reading.author or reading.publication %}
          <span class="subtitle">
            {% if reading.author %}By {{ reading.author }}{% endif %}
            {% if reading.publication %}, {{ reading.publication }}{% endif %}
          </span>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
</div>