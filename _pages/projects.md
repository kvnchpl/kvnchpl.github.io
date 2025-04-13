---
layout: default
title: projects
description: A collection of projects by Kevin Cunanan Chappelle.
permalink: /projects/
---

<h1>Projects</h1>

<div id="link-container">
  <ul>
    {% for project in site.projects %}
      <li class="row">
        <a href="{{ project.url }}">
          {{ project.title }}
        </a>
        {% if project.description %}
          <span class="subtitle">{{ project.description }}</span>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
</div>