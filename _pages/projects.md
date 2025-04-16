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
          {% if project.month and project.year %}
            <span class="subtitle">{{ project.month | date: "%B" }} {{ project.year }}</span>
          {% endif %}
        </div>
      </li>
    {% endfor %}
  </ul>
</div>