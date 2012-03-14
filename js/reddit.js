var Reddit = {}

Reddit.requestCount = 0

Reddit.apiRequest = function(url, callback) {
    Reddit.requestCount++
    var res = 'req'+Reddit.requestCount
    var html = document.getElementsByTagName('html')[0]
    var script = document.createElement('script')
    script.setAttribute('type', 'text/javascript')
    script.setAttribute('src', url+'?jsonp=(function(response){Reddit["'+res+'"]=response})')
    html.appendChild(script)
    var interval = setInterval(function(){
        if (Reddit[res]) {
            clearInterval(interval)
            var response = Reddit[res]
            delete Reddit[res]
            html.removeChild(script)
            if (callback) {
                callback(response) 
            } else {
                return response
            }
        }
    }, 200)
}

Reddit.subReddit = function(name) {
    /* Returns a SubReddit object.
    name: The name of the SubReddit.
    */
    var subreddit = new SubReddit(name, Reddit)
    return subreddit
}


var SubReddit = function(name, session) {

    var self = this
    self.name = name
    self.session = session

    self.getPosts = function(category, onPost, onEnd) {
        /* Returns the top posts in the SubReddit for the given category.
        category: (Optional, Default = 'hot') Can be 'new', 'controversial', 'top', or 'saved'.
        pages: (Optional, Default = 1) The number of pages to return results from.
        onPost: (Optional) A function called each time a post is retrieved. It will be given one Post object as an argument. If not specified, function returns a list instead.
        onEnd: (Optional) A function called when all of the posts have been retrieved. It is not given an argument.
        */
        if (category == 'hot' || category == undefined || category == null) {
            category = ''
        }
        var url = 'http://www.reddit.com/r/'+self.name+'/'+category+'.json'
        if (onPost != undefined && onPost != null) {
            self.session.apiRequest(url, function(res) {
                var children = res.data.children
                for (var i in children) {
                    if (children[i].hasOwnProperty('data')) {
                        var post = new Post(children[i].data, self, self.session)
                        onPost(post)
                    }
                }
                if (onEnd != undefined && onEnd != null) {
                    onEnd()
                }
            })

        } else {
            var res = self.session.apiRequest(url)
            var posts = []
            var children = res.data.children
            for (var i in children) {
                if (children[i].hasOwnProperty('data')) {
                    var post = new Post(children[i].data, self, self.session)
                    posts.push(post)
                }
            }
            return posts 
        }
    }

}


var Post = function(raw, subreddit, session) {

    var self = this
    self.subreddit = subreddit
    self.session = session
    for (var property in raw) {
        self[property] = raw[property]
    }

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
        /* Returns a list of comments on the post.
        onComment: (Optional) A function called each time a comment is retrieved. It will be given one Comment object as an argument. If not specified, function returns a list instead.
        onEnd: (Optional) A function called when all of the comments have been retrieved. It is not given an argument.
        */
        var safePermalink = self.permalink.split('/')
        safePermalink.pop()
        safePermalink.pop()
        safePermalink = safePermalink.join('/')
        var url = 'http://www.reddit.com'+safePermalink+'.json'
        if (onComment != undefined && onComment != null) {
            if (self.hasComments()) {
                self.session.apiRequest(url, function(res) {
                    var children = res[1].data.children
                    for (var i in children) {
                        if (children[i].hasOwnProperty('data') && children[i].data.hasOwnProperty('body')) {
                            var comment = new Comment(children[i].data, self, self, self.session)
                            onComment(comment)
                        }
                    }
                    if (onEnd != undefined && onEnd != null) {
                        onEnd()
                    }
                })
            } else {
                if (onEnd != undefined && onEnd != null) {
                    onEnd()
                }
            }
        } else {
            var comments = []
            if (self.hasComments()) {
                var res = self.session.apiRequest(url)
                var children = res[1].data.children
                for (var i in children) {
                    if (children[i].hasOwnProperty('data') && children[i].data.hasOwnProperty('body')) {
                        var comment = new Comment(children[i].data, self, self, self.session)
                        comments.push(comment)
                    }
                }
            }
            return comments
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
        if (self.hasOwnProperty('replies') && self.replies.hasOwnProperty('data') && self.replies.data.hasOwnProperty('children')) {
            return true
        } else {
            return false
        }
    }

    self.getReplies = function(onReply, onEnd) {
        /* Returns a list of replies to this comment.
        onReply: (Optional) A function called each time a reply is retrieved. It will be given one Comment object as an argument. If not specified, function returns a list instead.
        onEnd: (Optional) A function called when all of the replies have been retrieved. It is not given an argument.
        */
        if (onReply != undefined && onReply != null) {
            if (self.hasReplies()) {
                var children = self.replies.data.children
                for (var i in children) {
                    if (children[i].hasOwnProperty('data') && children[i].data.hasOwnProperty('body')) {
                        var comment = new Comment(children[i].data, self, self.post, self.session)
                        onReply(comment)
                    }
                }
            }
            if (onEnd != undefined && onEnd != null) {
                onEnd()
            }

        } else {
            var replies = []
            if (self.hasReplies()) {
                var children = self.replies.data.children
                for (var i in children) {
                    if (childrens[i].hasOwnProperty('data') && children[i].data.hasOwnProperty('body')) {
                        var comment = new Comment(children[i].data, self, self.post, self.session)
                        replies.push(comment)
                    }
                }
            }
            return replies
        }
    }

}