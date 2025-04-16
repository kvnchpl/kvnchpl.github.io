---
layout: default
title: projects
description: A collection of projects by Kevin Cunanan Chappelle.
permalink: /projects/
---

<div id="link-container">
  <ul>
    {% for project in site.projects %}
      <li class="row">
        <div class="link-wrapper">
          <a href="{{ project.url }}" class="project-link">
            {{ project.title }}
          </a>
          {% if project.description %}
            <span class="subtitle">{{ project.description }}</span>
          {% endif %}
        </div>
      </li>
    {% endfor %}
  </ul>
</div>