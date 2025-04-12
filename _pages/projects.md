---
title: Projects
description: See what I'm working on.
permalink: /projects/
---

<h1>Projects</h1>
<ul>
  {% for project in site.projects %}
    <li><a href="{{ project.url }}">{{ project.title }}</a></li>
  {% endfor %}
</ul>