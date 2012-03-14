window.onload = function() {

    // Hide the search-in-progress indicator until a search begins.
    document.getElementById('loadingimage').style.visibility = 'hidden'

    function addResult(comment, regex, target) {
        /* Adds comment text and info to the search results.
        comment: A reddit.js Comment object representing the comment to be added.
        */
        var results = target
        var result = document.createElement('div')
        if (results.childNodes.length == 0) {
            result.setAttribute('class', 'resultfirst')
        } else {
            result.setAttribute('class', 'result')
        }
        results.appendChild(result)
        var commentNode = document.createElement('span')
        commentNode.innerHTML = comment.body.replace(regex, '$1<span class="highlight">$2</span>$3')
        var commentlink = document.createElement('a')
        var authorlink = document.createElement('a')
        var postlink = document.createElement('a')
        commentlink.setAttribute('href', 'http://www.reddit.com'+comment.post.permalink+comment.id)
        authorlink.setAttribute('href', 'http://www.reddit.com/user/'+comment.author)
        postlink.setAttribute('href', 'http://www.reddit.com'+comment.post.permalink)
        commentlink.appendChild(document.createTextNode('comment'))
        authorlink.appendChild(document.createTextNode(comment.author))
        postlink.appendChild(document.createTextNode(comment.post.title))
        result.appendChild(commentNode)
        result.appendChild(document.createElement('br'))
        var info = document.createElement('div')
        info.setAttribute('class', 'resultinfo')
        result.appendChild(info)
        info.appendChild(commentlink)
        info.appendChild(document.createTextNode(' by '))
        info.appendChild(authorlink)
        info.appendChild(document.createTextNode(' in post '))
        info.appendChild(postlink)
    }

    function updateSearchingText(comments, posts, results) {
        /* Sets the searching text above search results to say 'Read x commends in y posts and found z results.'
        comments: The number of commends read.
        posts: The number of posts searched.
        results: The number of results found.
        */

        document.getElementById('resultcount').innerHTML = 'read '+comments+' comments in '+posts+' posts and found '+results+' results'
    }

    document.getElementById('searchbutton').onclick = function() {
        /* Performs search when the search button is clicked. Finds all the posts on the front page of the chosen subreddit containing the query.
        */
        var container = document.getElementById('container')
        var results = document.getElementById('results')
        if (results) {
            container.removeChild(results)
        }
        results = document.createElement('div')
        results.setAttribute('id', 'results')
        container.insertBefore(results, document.getElementById('loadingimage'))
        var loadingimage = document.getElementById('loadingimage')
        var resultcount = document.getElementById('resultcount')
        resultcount.innerHTML = 'read 0 comments in 0 posts and found 0 results'
        loadingimage.style.visibility = ''
        var container = document.getElementById('container')
        var query = new RegExp('([^A-z])('+document.getElementById('searchfield').value+')([^A-z])','gi')
        var subredditfilter = document.getElementById('subredditfield').value
        if (subredditfilter.length == 0) {
            subredditfilter = 'all'
        }
        var subReddit = Reddit.subReddit(subredditfilter)
        var postsread = 0
        var commentsread = 0
        var resultsfound = 0
        var loadingcount = 0

        function searchIsActive() {
            return results.parentNode != null
        }

        function onEnd() {
            loadingcount--
            if (searchIsActive()) {
                if (loadingcount == 0 && searchIsActive()) {
                    loadingimage.style.visibility = 'hidden'
                    if (results.childNodes.length == 0) {
                        var noresult = document.createElement('div')
                        noresult.setAttribute('class', 'resultfirst')
                        noresult.appendChild(document.createTextNode('no results found :('))
                        results.appendChild(noresult)
                    }
                }
                updateSearchingText(commentsread, postsread, resultsfound)
            }
        }

        function searchComments(post) {
            if (post.hasComments() && searchIsActive()) {
                loadingcount++
                post.getComments(function(comment) {
                    commentsread++
                    comment.body = ' '+comment.body+' '
                    if (query.test(comment.body)) {
                        resultsfound++
                        addResult(comment, query, results)
                    }
                    if (comment.hasReplies()) {
                        searchCommentReplies(comment)
                    }
                }, onEnd)
            }
        }

        function searchCommentReplies(comment) {
            if (comment.hasReplies() && searchIsActive()) {
                loadingcount++
                comment.getReplies(function(reply) {
                    commentsread++
                    reply.body = ' '+reply.body+' '
                    if (query.test(reply.body)) {
                        resultsfound++
                        addResult(reply, query, results)
                    }
                    if (reply.hasReplies()) {
                        searchCommentReplies(reply)
                    }
                }, onEnd)
            }
        }

        loadingcount++
        subReddit.getPosts('hot', function(post) {
            postsread++
            searchComments(post)
        }, onEnd)
    }

}