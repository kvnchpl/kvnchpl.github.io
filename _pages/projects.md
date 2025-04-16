---
layout: default
title: projects
description: A collection of projects by Kevin Cunanan Chappelle.
permalink: /projects/
---

<div id="link-container">
  <ul>
    {% for project in site.data.projects %}
      <li class="row">
        <div class="link-wrapper">
          <a href="{{ project.href }}" {% if project.external %}target="_blank" rel="noopener noreferrer"{% endif %}>
            {{ project.title }}
          </a>
          {% if project.month and project.year %}
            <span class="subtitle">
              {{ project.month | date: "%B" }} {{ project.year }}
            </span>
          {% endif %}
        </div>
      </li>
    {% endfor %}
  </ul>
</div>