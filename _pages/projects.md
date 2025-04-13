---
layout: default
title: projects
description: A collection of projects by Kevin Cunanan Chappelle.
permalink: /projects/
---

<h1>Projects</h1>

<div id="link-container">
  {% for project in site.projects %}
    <div class="row">
      <div class="link-wrapper">
        <a href="{{ project.url }}">
          {{ project.title }}
        </a>
        {% if project.description %}
          <span class="subtitle">{{ project.description }}</span>
        {% endif %}
      </div>
    </div>
  {% endfor %}
</div>