var Reddit = {}
Reddit.requestCount = 0

Reddit.apiRequest = function(url, callback) {
    /* Fetches JSON from the reddit API at the given URL by using JSONP.
    url: The url to make a request to.
    callback: (Optional) A function called when the response is received. If not specified, the response will be returned instead.
    */
    Reddit.requestCount++
    var res = 'req'+Reddit.requestCount
    var html = document.getElementsByTagName('html')[0]
    var script = document.createElement('script')
    script.setAttribute('type', 'text/javascript')
    var prefix = '?'
    if (url.indexOf('?') > -1) {
        prefix = '&'
    }
    script.setAttribute('src', url+prefix+'jsonp=(function(response){Reddit["'+res+'"]=response})')
    var redditdiv = document.getElementById('redditapi')
    if (!redditdiv) {
        redditdiv = document.createElement('div')
        redditdiv.setAttribute('id', 'redditapi')
        html.appendChild(redditdiv)
    }
    redditdiv.appendChild(script)
    var interval = setInterval(function(){
        if (!redditdiv) {
            clearInterval(interval)
        }
        if (Reddit[res]) {
            clearInterval(interval)
            var response = Reddit[res]
            delete Reddit[res]
            redditdiv.removeChild(script)
            if (callback) {
                callback(response) 
            } else {
                return response
            }
        }
    }, 200)
}

Reddit.clearRequests = function() {
    var redditdiv = document.getElementById('redditapi')
    if (redditdiv) {
        redditdiv.parentNode.removeChild(redditdiv)
    }
}

Reddit.subreddit = function(name) {
    /* Returns a Subreddit object.
    name: The name of the Subreddit.
    */
    var subreddit = new Subreddit(name, Reddit)
    return subreddit
}


var Subreddit = function(name, session) {

    var self = this
    self.name = name
    self.session = session

    self.getPosts = function(category, onPost, onEnd, startPoint) {
        /* Retrieves the top posts in the Subreddit for the given category.
        category: Can be 'hot', 'new', 'controversial', 'top', or 'saved'.
        onPost: A function called each time a post is retrieved. It will be given one Post object as an argument. If not specified, function returns a list instead.
        onEnd: (Optional) A function called when all of the posts on the current page have been retrieved. If there are more posts remaining, it is given a function as an argument, which can be called to get the next page of posts.
        startPoint: (Optional) Used to start past the first point on the front page. Should be a Reddit thing_id.
        */
        if (category == 'hot') {
            category = ''
        }
        var url = 'http://www.reddit.com/r/'+self.name+'/'+category+'.json?limit=100'
        if (startPoint) {
            url = url+'?after='+startPoint
        }
        self.session.apiRequest(url, function(res) {
            var children = res.data.children
            for (var i in children) {
                if (children[i].data) {
                    var post = new Post(children[i].data, self, self.session)
                    onPost(post)
                }
            }
            if (onEnd) {
                var arg = null
                var endPoint = res.data.after
                if (endPoint) {
                    arg = function(){self.getPosts(category, onPost, onEnd, endPoint)}
                }
                onEnd(arg)
            }
        })
    }
}


var Post = function(raw, subreddit, session) {

    var self = this
    self.subreddit = subreddit
    self.session = session
    for (var property in raw) {
        self[property] = raw[property]
    }
    self.safePermalink = self.permalink.split('/')
    self.safePermalink.pop()
    self.safePermalink.pop()
    self.safePermalink = self.safePermalink.join('/')
    self.safePermalink += '/_/'

    self.hasComments = function() {
        /* Checks if the this post has comments.
        Returns a boolean true if it does, and false if it does not.
        */
        if (self.num_comments > 0) {
            return true
        } else {
            return false
        }
    }

    self.getComments = function(onComment, onEnd) {
        /* Retrieves the comments on this post.
        onComment: A function called each time a comment is retrieved. It will be given one Comment object as an argument.
        onEnd: (Optional) A function called when all of the comments have been retrieved.
        */
        var url = 'http://www.reddit.com'+self.safePermalink+'.json?limit=500'
        if (self.hasComments()) {
            self.session.apiRequest(url, function(res) {
                var children = res[1].data.children
                for (var i in children) {
                    if (children[i].data && children[i].data.body) {
                        var comment = new Comment(children[i].data, self, self, self.session)
                        onComment(comment)
                    }
                }
                var lastIndex = children.length-1
                if (children[lastIndex].kind == 'more') {
                    children = children[lastIndex].data.children
                    for (var i in children) {
                        var commentId = children[i]
                        url = 'http://www.reddit.com'+self.safePermalink+commentId+'.json'
                        self.session.apiRequest(url, function(res) {
                            var children = res[1].data.children
                            for (var i in children) {
                                if (children[i].data && children[i].data.body) {
                                    var comment = new Comment(children[i].data, self, self, self.session)
                                    onComment(comment)
                                }
                            }
                        })
                    }
                }
                if (onEnd) {
                    onEnd()
                }
            })
        } else if (onEnd) {
            onEnd()
        }
    }

}


var Comment = function(raw, parent, post, session) {

    var self = this
    self.parent = parent
    self.post = post
    self.session = session
    for (var property in raw) {
        self[property] = raw[property]
    }

    self.hasReplies = function() {
        /* Checks if this comment has replies.
        Returns a boolean true if the comment has replies, and false if it does not.
        */
        if (self.replies && self.replies.data && self.replies.data.children) {
            return true
        } else {
            return false
        }
    }

    self.getReplies = function(onReply, onEnd) {
        /* Retrieves the replies to this comment.
        onReply: A function called each time a reply is retrieved. It will be given one Comment object as an argument.
        onEnd: (Optional) A function called when all of the replies have been retrieved. It is not given an argument.
        */
        if (self.hasReplies()) {
            var children = self.replies.data.children
            for (var i in children) {
                if (children[i].data && children[i].data.body) {
                    var comment = new Comment(children[i].data, self, self.post, self.session)
                    onReply(comment)
                }
            }
            /*
            var lastIndex = children.length-1
            if (children[lastIndex].kind == 'more') {
                console.log('test')
                children = children[lastIndex].data.children
                for (var i in children) {
                    var commentId = children[i]
                    var url = 'http://www.reddit.com'+self.post.safePermalink+commentId+'.json'
                    self.session.apiRequest(url, function(res) {
                        var comment = new Comment(children[i].data, self, self, self.session)
                        onReply(comment)
                    })
                }
            }
            */
            if (onEnd) {
                onEnd()
            }  
        } else if (onEnd) {
            onEnd()
        }
    }

}