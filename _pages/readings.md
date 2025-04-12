---
title: Readings
description: See what I'm reading.
permalink: /readings/
---

<h1>Readings</h1>
<ul>
  {% for reading in site.data.readings %}
    <li>
      <strong>{{ reading.title }}</strong> by {{ reading.author }} ({{ reading.year }})
      {% if reading.link %}
        - <a href="{{ reading.link }}" target="_blank" rel="noopener noreferrer">Read more</a>
      {% endif %}
    </li>
  {% endfor %}
</ul>