/*
(function() {
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  window.Todo = (function() {
    __extends(Todo, Backbone.Model);
    function Todo() {
      Todo.__super__.constructor.apply(this, arguments);
    }
    Todo.prototype.defaults = {
      content: "empty todo...",
      done: false,
      location: "undefined",
      sublocation: "none"
    };
    Todo.prototype.initialize = function() {
      if (!this.get("content")) {
        return this.set({
          "content": this.defaults.content
        });
      }
    };
    Todo.prototype.toggle = function() {
      return this.save({
        done: !this.get("done")
      });
    };
    Todo.prototype.clear = function() {
      this.destroy();
      return this.view.remove();
    };
    return Todo;
  })();
  window.TodoList = (function() {
    __extends(TodoList, Backbone.Collection);
    function TodoList() {
      TodoList.__super__.constructor.apply(this, arguments);
    }
    TodoList.prototype.model = window.Todo;
    TodoList.prototype.localStorage = new Store("jot");
    TodoList.prototype.remaining = function() {
      return this.without.apply(this, this.done());
    };
    TodoList.prototype.nextOrder = function() {
      if (!this.length) {
        return 1;
      } else {
        return this.last().get('order') + 1;
      }
    };
    TodoList.prototype.comparator = function(todo) {
      return todo.get('order');
    };
    return TodoList;
  })();
  window.Todos = new window.TodoList();
  window.HistoryView = (function() {
    __extends(HistoryView, Backbone.View);
    function HistoryView() {
      HistoryView.__super__.constructor.apply(this, arguments);
    }
    HistoryView.prototype.el = $('.history-content');
    HistoryView.prototype.tagName = "div";
    HistoryView.prototype.template = _.template($('#history-template').html());
    HistoryView.prototype.initialize = function() {
      _.bindAll(this, 'render');
      return this.render();
    };
    HistoryView.prototype.render = function() {
      $(this.el).html(this.template());
      return this;
    };
    return HistoryView;
  })();
  window.History = new window.HistoryView();
  window.RosView = (function() {
    __extends(RosView, Backbone.View);
    function RosView() {
      RosView.__super__.constructor.apply(this, arguments);
    }
    RosView.prototype.el = $('.ros-container');
    RosView.prototype.tagName = "div";
    RosView.prototype.template = _.template($('#ros-section').html());
    RosView.prototype.initialize = function() {
      _.bindAll(this, 'render');
      return this.render();
    };
    RosView.prototype.render = function() {
      $(this.el).html(this.template());
      return this;
    };
    return RosView;
  })();
  window.Ros = new RosView();
  window.TodoView = (function() {
    __extends(TodoView, Backbone.View);
    function TodoView() {
      TodoView.__super__.constructor.apply(this, arguments);
    }
    TodoView.prototype.tagName = "li";
    TodoView.prototype.template = _.template($('#item-template').html());
    TodoView.prototype.events = {
      "click .check": "toggleDone",
      "dblclick div.todo-content": "edit",
      "click .todo-move": "setLocation",
      "click span.tag": "setLocation",
      "click span.todo-destroy": "clear",
      "keypress .todo-input": "updateOnEnter"
    };
    TodoView.prototype.initialize = function() {
      _.bindAll(this, 'render', 'close');
      this.model.bind('change', this.render);
      return this.model.view = this;
    };
    TodoView.prototype.render = function() {
      $(this.el).html(this.template(this.model.toJSON()));
      this.setContent();
      return this;
    };
    TodoView.prototype.setContent = function() {
      var content;
      content = this.model.get('content');
      this.$('.todo-content').text(content);
      this.input = this.$('.todo-input');
      this.input.bind('blur', this.close);
      return this.input.val(content);
    };
    TodoView.prototype.setLocation = function(e) {
      var location;
      location = $(e.target).text();
      return this.model.set({
        location: location
      }).save();
    };
    TodoView.prototype.toggleDone = function() {
      return this.model.toggle();
    };
    TodoView.prototype.edit = function() {
      $(this.el).addClass("editing");
      return this.input.focus();
    };
    TodoView.prototype.close = function() {
      this.model.save({
        content: this.input.val()
      });
      return $(this.el).removeClass("editing");
    };
    TodoView.prototype.updateOnEnter = function(e) {
      if (e.keyCode === 13) {
        return this.close();
      }
    };
    TodoView.prototype.remove = function() {
      return $(this.el).remove();
    };
    TodoView.prototype.clear = function() {
      return this.model.clear();
    };
    return TodoView;
  })();
  /*
  # The Application
  # ---------------
  
  # Our overall **AppView** is the top-level piece of UI.
  window.AppView = Backbone.View.extend({
  
    # Instead of generating a new element, bind to the existing skeleton of
    # the App already present in the HTML.
    el: $("#center-app"),
  
    # destination template
    #
    destinationTemplate: _.template($('#destination-template').html()),
  
  
  
    # Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-todo":  "createOnEnter",
      "keyup #new-todo":     "checkText",
      "click span#help":     "showHelp",
      "click .tag" :         "setAutoTag",
    },
  
    # At initialization we bind to the relevant events on the `Todos`
    # collection, when items are added or changed. Kick things off by
    # loading any preexisting todos that might be saved in *localStorage*.
    initialize: -> {
      _.bindAll(this, 'addOne', 'addAll', 'render', 'setAutoTag', 'move', 'checkText', 'showROS', 'toggleDetails', 'jotROS');
  
      this.input    = this.$("#new-todo");
  
      this.currentDestination  =  "JOT";
      this.currentROS = 0;
  
      Todos.bind('add',             this.addOne);
      Todos.bind('change:location', this.move);
      Todos.bind('reset',           this.addAll);
      Todos.bind('all',             this.render);
  
  
      window.Todos.fetch();
    },
  
  
    # Re-rendering the App just means refreshing the current auto-tag
    #
    render: -> {
      var current = this.currentDestination.toLowerCase() ;
      this.$('#current-destination').html(this.destinationTemplate());
      this.$('.auto-tag').children().removeClass('current-tag').filter('.' + current).addClass('current-tag');
      this.toggleDetails(current);
    },
  
    setAutoTag: function(e) {
      this.input.focus();
      this.currentDestination = $(e.target).text();
      this.render();
    },
  
    move: function(todo) {
      todo.view.remove();
      var view = new TodoView({model: todo});
      var location = todo.get('location').toLowerCase();
      $(".jot-list").filter('.'+location).append(view.render().el);
  
    },
  
    # Add a single todo item to the list by creating a view for it, and
    # appending its element to the `<ul>`.
    #
    # Add the jot to the correct list
    #
    addOne: function(todo) {
      var view = new TodoView({model: todo});
      if (todo.get('content').length > 0) {
        var location = todo.get('location').toLowerCase();
        $(".jot-list").filter('.'+location).append(view.render().el);
      } else {
        todo.view.clear();
      }
    },
  
    # Add all items in the **Todos** collection at once.
    addAll: -> {
      Todos.each(this.addOne);
    },
  
    # Generate the attributes for a new Todo item.
    newAttributes: -> {
      return {
        content: this.input.val(),
        order:   Todos.nextOrder(),
        location: "none",
        done:    false
      };
    },
  
    # If you hit return in the main input field, create new **Todo** model,
    # persisting it to *localStorage*.
    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      var content = this.input.val();
      var attrs = this.newAttributes();
      attrs.content = content;
      attrs.location = this.currentDestination;
  
      Todos.create(attrs);
      this.input.val('');
    },
  
    # reshow help menu
    showHelp: -> {
      $("#guider_overlay").fadeIn("fast");
      $('.guider').fadeIn("fast");
    },
  
  
    # on keyup check input box for commands flags shortcuts
    checkText: function(e) {
  
  
      var val = this.input.val();
  
      # test for flags (.hpi, .ros, .pmh)
  
      if (/\.(pt|cc|hpi|pmh|psh|meds|all|sh|fh|ros|jot)/i.test(val)) {
        var flag = val.match(/\.(pt|cc|hpi|pmh|psh|meds|all|sh|fh|ros|jot)/i);
        this.currentDestination = flag[1].toUpperCase();
        val = val.replace(/\.(pt|cc|hpi|pmh|psh|meds|all|sh|fh|ros|jot)/i, "");
        this.input.val(val);
        this.render();
        #this.toggleDetails();
  
      };
  
      # ROS section controls
      # use '>' and '<' to cycle through sections (shows previsou current + next 2)
      if (this.currentDestination == 'ROS') {
        # remove previous highlights
  
        this.$('.ros-state').removeClass('highlight-keycode');
        this.$('.ros-item').removeClass('last-ros');
        # cycle ROS
        var c = this.currentROS;
        if (/</.test(val)) { (c == 0) ? c = 0 : c -= 1 };
        if (/>/.test(val)) { (c > 13) ? c : c += 1 };
        this.currentROS = c;
        val = val.replace(/(<|>)/i, "");
        this.showROS();
        this.input.val(val);
  
        if ((/\w/i).test(val) && !(/(\.|-)/).test(val)) {
          #highlight section on first letter
  
          # get index to set showROS
          this.$('.'+ val.toUpperCase()).addClass('highlight-keycode');
          if ((/\w\w/i).test(val)) {
  
            val = val.toUpperCase();
            var rosItem = this.$('.' + val);
            var potentialROS = rosItem.parent().parent().parent().index();
  
            # make sure ROS section is in view ( dont want to mark non visable sections #
  
            if (this.currentROS-1 <= potentialROS && potentialROS <= this.currentROS + 2) {
              # toggles yes/no/unasked
              if (rosItem.hasClass('ros-yes')) {
                rosItem.removeClass('ros-yes').filter('.ros-content').addClass('ros-no');
              } else if (rosItem.hasClass('ros-no')) {
                rosItem.removeClass('ros-no');
              } else {
                rosItem.filter('.icon').addClass('ros-yes');
              };
  
              this.currentROS = rosItem.parent().addClass('last-ros').parent().parent().index();
            };
            this.input.val('');
            #alert(i);
            #this.currentROS = index;
            this.showROS();
          };
  
        };
        
        #this.jotROS(val);
  
  
  
      };
  
  
    },
  
    # add jots to ros symptoms with a dash
    # example if SA is keycode for headache
    # "-sa 6 over the past week" would add a specific jot
    # to the headache symptom of ROS
    jotROS: function(v) {
      if ( (/-(\w\w)/i).test(v)) {alert()};
    },
  
    # show active ROS sections (have too many sections to show all at once)
    showROS: -> {
      var sections = this.$('.ros-container').children().hide();
      var start = this.currentROS > 1 ? this.currentROS : 1;
      sections.slice(start-1,start+3).show().index();
    },
  
    # toggle details container below input for extras
    toggleDetails: function(current) {
      this.$('.details').hide();
      this.$('.' + current + '-container').show();
      this.showROS();
    }
  });
  
  
  
  
  
  # Finally, we kick things off by creating the **App**
  window.App = new AppView;
  
  
  });
}).call(this);
*/
