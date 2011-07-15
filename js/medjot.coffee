

# Todo Model
# ----------

# Our basic **Todo** model has `content`, `order`, and `done` attributes.
class window.Todo extends Backbone.Model

  # Default attributes for the todo.
  defaults: 
    content: "empty todo..."
    done: false
    location: "undefined"
    sublocation: "none"
  

  # Ensure that each todo created has `content`.
  initialize: ->
    if not @get "content"
      @set "content": @defaults.content
    
  
  # Toggle the `done` state of this todo item.
  toggle: -> 
    @save done: !@get "done" 
  


  # Remove this Todo from *localStorage* and delete its view.
  clear: -> 
    @destroy()
    @view.remove()
 



# Todo Collection



# ---------------

# The collection of todos is backed by *localStorage* instead of a remote
# server.
class window.TodoList extends Backbone.Collection

  # Reference to this collection's model.
  model: window.Todo

  # Save all of the todo items under the `"todos"` namespace.
  localStorage: new Store "jot"

  # Filter down the list of all todo items that are finished.

  # Filter down the list to only todo items that are still not finished.
  remaining: -> 
    @without.apply(this, @done())
  

  # We keep the Todos in sequential order, despite being saved by unordered
  # GUID in the database. This generates the next order number for new items.
  nextOrder: -> 
    if not @length
      1
    else 
      @last().get('order') + 1
  

  # Todos are sorted by their original insertion order.
  comparator: (todo) -> 
    todo.get 'order'




window.Todos = new window.TodoList()



# history view
#
class window.HistoryView extends Backbone.View

  el:           $('.history-content')

  tagName:      "div"

  template:      _.template($('#history-template').html())

 # events:


  initialize: -> 
    _.bindAll(this, 'render')
    @render()


  render: ->
    $(@el).html(@template())
    @



window.History = new window.HistoryView()

# Review of systems View

class window.RosView extends Backbone.View

  el:  $('.ros-container')
  tagName:  "div"
  template: _.template($('#ros-section').html())
  #events:   {}

  initialize: -> 
    _.bindAll(this, 'render')
    @render()


  render: ->
    $(@el).html(@template())
    @



window.Ros = new RosView()

# Todo Item View
# --------------

# The DOM element for a todo item...
class window.TodoView extends Backbone.View

  #... is a list tag.
  tagName:  "li"

  # Cache the template function for a single item.
  template: _.template($('#item-template').html())


  # The DOM events specific to an item.
  events: 
    "click .check"              : "toggleDone"
    "dblclick div.todo-content" : "edit"
    "click .todo-move"          : "setLocation"
    "click span.tag"            : "setLocation"
    "click span.todo-destroy"   : "clear"
    "keypress .todo-input"      : "updateOnEnter"
  

  # The TodoView listens for changes to its model, re-rendering. Since there's
  # a one-to-one correspondence between a **Todo** and a **TodoView** in this
  # app, we set a direct reference on the model for convenience.
  initialize: -> 
    _.bindAll(this, 'render', 'close')
    @model.bind('change', @render)
    @model.view = @
  

  # Re-render the contents of the todo item.
  render: -> 
    $(@el).html(@template(@model.toJSON()))
    @setContent()
    @


  # To avoid XSS (not that it would be harmful in this particular app),
  # we use `jQuery.text` to set the contents of the todo item.
  setContent: -> 
    content = @model.get('content')

    @$('.todo-content').text(content)
    @input = @$('.todo-input')
    @input.bind('blur', @close)
    @input.val(content)


  # Set location attribute
  setLocation: (e) ->
    location = $(e.target).text()
    @model.set({location: location}).save()


  # Toggle the `"done"` state of the model.
  toggleDone: -> 
    @model.toggle()


  # Switch this view into `"editing"` mode, displaying the input field.
  edit: -> 
    $(@el).addClass("editing")
    @input.focus()


  # Close the `"editing"` mode, saving changes to the todo.
  close: -> 
    @model.save content: @input.val()
    $(@el).removeClass("editing")


  # If you hit `enter`, we're through editing the item.
  updateOnEnter: (e) ->
    @close() if e.keyCode is 13


  # Remove this view from the DOM.
  remove: -> 
    $(@el).remove()


  # Remove the item, destroy the model.
  clear: -> 
    @model.clear()






# The Application
# ---------------

# Our overall **AppView** is the top-level piece of UI.
class window.AppView extends Backbone.View

  # Instead of generating a new element, bind to the existing skeleton of
  # the App already present in the HTML.
  el: $("#center-app")

  # destination template
  #
  destinationTemplate: _.template($('#destination-template').html())



  # Delegated events for creating new items, and clearing completed ones.
  events: 
    "keypress #new-todo":  "createOnEnter"
    "keyup #new-todo":     "checkText"
    "click span#help":     "showHelp"
    "click .tag" :         "setAutoTag"
  

  # At initialization we bind to the relevant events on the `Todos`
  # collection, when items are added or changed. Kick things off by
  # loading any preexisting todos that might be saved in *localStorage*.
  initialize: ->
    _.bindAll(this, 'addOne', 'addAll', 'render', 'setAutoTag', 'move', 'checkText', 'showROS', 'toggleDetails', 'jotROS')

    @input    = @$("#new-todo")

    @currentDestination  =  "JOT"
    @currentROS = 0

    window.Todos.bind('add',             @addOne())
    window.Todos.bind('change:location', this.move())
    window.Todos.bind('reset',           this.addAll())
    window.Todos.bind('all',             this.render())


    window.Todos.fetch()
  


  # Re-rendering the App just means refreshing the current auto-tag
  #
  render: -> 
    current = @currentDestination.toLowerCase()
    @$('#current-destination').html(this.destinationTemplate())
    @$('.auto-tag').children().removeClass('current-tag').filter('.' + current).addClass('current-tag')
    @toggleDetails(current)
  

  setAutoTag: (e) ->
    @input.focus()
    @currentDestination = $(e.target).text()
    @render()
  

  move: (todo) ->
    todo.view.remove()
    view = new window.TodoView({model: todo})
    location = todo.get('location').toLowerCase()
    $(".jot-list").filter('.'+location).append(view.render().el)

  

  # Add a single todo item to the list by creating a view for it, and
  # appending its element to the `<ul>`.
  #
  # Add the jot to the correct list
  #
  addOne: (todo) -> 
    view = new window.TodoView({model: todo})
    if (todo.get('content').length > 0)
      location = todo.get('location').toLowerCase();
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


