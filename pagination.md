# Pagination

```yaml
collections:
  posts:

```



```yaml
collections:
  posts:
    pagination:
      per_page: 3
      list:
        permalink:
          structure: :num.html
      item:
        permalink:
          structure: /blog/:name-:num/

collections:
  posts:
    pagination:
      per_page: 3
      list:
        permalink: :num.html
      item:
        permalink: /blog/:name-:num/

collections:
  posts:
    pagination:
      per_page: 3
      list: :num.html
      item: /blog/:name-:num/
```



## Blog posts

- 10 blog posts
-


```yaml
collections:
  posts:
    pagination:
      per_page: 3
      list:
        permalink:
          structure: :num.html
      item:
        permalink:
          structure: /blog/page-:num/
```


```
/:num.html
  /blog/:name-:num/
```


```handlebars
<!-- index.html -->
{{#each posts as |post|}}
  {{url post "/blog/:name-:num"}}
  {{url post post.data.permalink}}
{{/each}}
```


## Tags

- 10 blog posts
- 5 tags

```yaml
collections:
  tags:
    pagination:
      per_page: 3 # 3 tags per page
      list:
        permalink:
          structure: :num.html
        data:
          title: Page - List :num
      item:
        per_page: 5 # five posts with this tag per page
        permalink:
          structure: /tags/:tag-:num/
        data:
          title: ":list.title | Item - :num"
```



```
/:num.html
  /blog/:name-:num/
```


```handlebars
<!-- index.html -->
{{#each posts as |post|}}
  {{url post "/blog/:name-:num"}}
  {{url post post.data.permalink}}
{{/each}}
```


## Blog posts

- 10 blog posts
-

```yaml
pagination:
  per_page: 3
```



```
/index.html
  /blog/:name-:num/
```


```handlebars
<!-- index.html -->
{{#each posts as |post|}}
  {{url post "/blog/:name-:num"}}
  {{url post post.data.permalink}}
{{/each}}
```




```
/index.html
  /blog/:name-:num/
```


```handlebars
<!-- index.html -->
{{#each posts as |post|}}
  {{url post "/blog/:name-:num"}}
  {{url post post.data.permalink}}
{{/each}}
```



