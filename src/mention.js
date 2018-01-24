class Mention {
	/**
	* @class Mention
	* @classdesc Allows using a symbol to display options
	*
	* @param {Object} settings - Options to initialize the component with
	* @param {HTMLElement} settings.input - The textarea to watch {@link Component#input}
	* @param {HTMLElement} settings.optionList - Element to display options when matched {@link Component#optionList}
	* @param {Array} settings.options - Array of options. Options can have properties {@link Component#options}
	* @param {String} [settings.symbol="@"] - The symbol that initials the option list {@link Component#symbol}
	* @param {Function} [settings.match] - The function used to match options {@link Component#match}
	* @param {Function} [settings.template] - The template function outputs the innerHTML of the optionlist {@link Component#template}
	*/
   constructor(settings) {
      var that = this
      this.options = settings.options || []
      this.input = settings.input
      this.reverse = settings.reverse

      this.symbol = settings.symbol || '@'
      this.cursorPosition = 0
      this.hover = 0
      this.showingOptions = false
      this.upDownStay = 0
      this.wordAtCursor = {}
      this.update = settings.update || function(){}
      this.match = settings.match || this.defaultMatchFunction
      this.template = settings.template || this.defaultTemplateFunction
      this.html = {
         input: undefined,
         display: undefined,
         wrapper: undefined,
         optionsList: undefined,
         options: [],
         spans: [] }
      this.setupHTML()
      this.listen()
   }

	/**
	* Function used to match options based on the word
	* @param {String} [word] - The current word ex. @test
	* @param {String} [option] - The options being looped
	* @return {boolean} - If the word matches the option
	*/
   defaultMatchFunction(word, option) {
      var optionText = option.name || option
      return (!word.length || optionText.startsWith(word.replace('@', '')))
   }

	/**
	* Function returns the template (innerHTML) that will be used for each option
	* @param {String} [option] - The options being looped
	* @return {String} - The innerHTM
	*/
   defaultTemplateFunction(option) {
      return option.name || option
   }

	/**
	* Sets up the HTML. Wrapper, Display, OptionsList, Options
	*/
	setupHTML() {
      this.html.input = this.input
      var computedStyleInput = window.getComputedStyle(this.html.input, "")
      this.html.wrapper = document.createElement('div')
      this.html.wrapper.classList.add('mention-wrapper')
      this.html.wrapper.style.position = 'relative'
      this.html.wrapper.style.width = computedStyleInput.getPropertyValue('width')

      this.html.display = document.createElement('div')
      this.html.display.classList.add('mention-display')
      this.html.input.parentElement.insertBefore(this.html.wrapper, this.html.input)
      this.html.wrapper.appendChild(this.html.input)
      this.html.wrapper.appendChild(this.html.display)

      for(var prop in computedStyleInput){
         try { this.html.display.style[prop] = computedStyleInput[prop] } catch(e) { }
      }
      if(/iPhone|iPad|iPod|Edge/i.test(navigator.userAgent)){
         this.html.display.style.paddingLeft = parseInt(computedStyleInput.getPropertyValue('padding-left')) + 3 + 'px'
         if(navigator.userAgent.includes('Edge')){
            this.html.display.style.paddingTop = parseInt(computedStyleInput.getPropertyValue('padding-top')) + 3 + 'px'
         }
      }
      this.html.display.style.wordBreak = 'break-word'
      this.html.display.style.wordWrap = 'break-word'
      this.html.display.style.background = 'transparent';
      this.html.display.style.pointerEvents = "none"
      this.html.display.style.position = "absolute"
      this.html.display.style.left = '0px'
      this.html.display.style.top = '0px'
      this.html.display.style.width = '100%';
      this.html.input.style.width = '100%'
      this.html.display.style.height = 'fit-content'

      this.html.optionsList = document.createElement('div')
      this.html.optionsList.classList.add('mention-options')
      this.html.wrapper.appendChild(this.html.optionsList)
      if(this.reverse) {
         this.html.optionsList.classList.add('mention-options-reverse')
         this.html.wrapper.insertBefore(this.html.optionsList, this.html.wrapper.firstChild)
      }


      for(var option of this.options) {
         var optionElement = document.createElement('div')
         optionElement.classList.add('mention-option')
         optionElement.innerHTML = this.template(option)
         optionElement.setAttribute('mentiondata', JSON.stringify(option))
         this.html.options.push(optionElement)
         this.html.optionsList.appendChild(optionElement)
      }
   }

	/**
	* Begins listening for events on the input and options
	*/
   listen() {
      this.html.input.addEventListener('input', () => { this.onEventInput() })
      this.html.input.addEventListener('keydown', (e) => { this.onEventKeyDown(e) })
      this.html.input.addEventListener('keyup', (e) => { this.onEventKeyUp(e) })
      this.html.options.forEach((o) => {
         o.addEventListener('click', (e) => { this.onEventOptionClick(e.target) })
      })
   }

	/**
	* Called when  on input.addEventListener('input')
	* @param {Event} e - the event passed
	*/
	onEventInput() {
		this.updateDisplay()
      this.update()
	}

   /**
	* Called when  on input.addEventListener('keyup')
	* @param {Event} e - the keyboard event passed
	*/
   onEventKeyDown(e) {
      this.upDownStay = e.keyCode == 40 ? 1 : e.keyCode == 38 ? -1 : 0
      if(this.reverse) this.upDownStay *= -1
      if(this.upDownStay && this.showingOptions) e.preventDefault()
      if(e.keyCode == 13 && this.showingOptions) {
         e.preventDefault()
         this.onEventOptionClick(this.html.options.find((e) => e.classList.contains('hover')))

      }
   }

   /**
	* Called when  on input.addEventListener('keydown')
	* @param {Event} e - the event passed
	*/
   onEventKeyUp() {
      this.cursorPositionChanged()
      this.setHoverOption()
   }

   /**
	* Called when option input.addEventListener('click')
	*/
   onEventOptionClick(optionEle) {
      var word = this.symbol + JSON.parse(optionEle.getAttribute('mentiondata')).name + ' '
      var splitInputValue = this.html.input.value.split('')
      splitInputValue.splice(this.wordAtCursor.index, this.wordAtCursor.word.length, word)
      this.html.input.value = splitInputValue.join('')
      this.html.input.focus()
      this.setCursorPosition(this.wordAtCursor.index + word.length + 1)
      this.updateDisplay()
      this.toggleOptions(false)
      this.update()
   }

   /**
   * Cursor position changed. Check for input data and toggle options
   */
   cursorPositionChanged() {
      this.cursorPosition = this.html.input.selectionStart
		this.wordAtCursor = this.readWordAtCursor({ cursorPosition: this.cursorPosition, value: this.input.value })
      this.toggleOptions(this.wordAtCursor.word.length && this.wordAtCursor.word[0] == this.symbol)
		this.optionsMatch()
   }

	/**
	* Updates the display (finds mentions and underlines/bolds them)
	*/
   updateDisplay() {
      this.html.display.innerHTML = this.convertInputValueToHTML()

      // Fix the html styles
      var computedStylesInput = window.getComputedStyle(this.html.input)
      var minHeight = parseInt(computedStylesInput.getPropertyValue('min-height'))
      minHeight += parseInt(computedStylesInput.getPropertyValue('padding-bottom'))
      minHeight += parseInt(computedStylesInput.getPropertyValue('border-width'))/2
      if( minHeight < this.html.display.offsetHeight) minHeight = this.html.display.offsetHeight
      this.html.input.style.height = minHeight + 'px'
   }

	/**
	* From the cursor positoin looks back to match the work and start/end position
	* @param {Object} data - Options to initialize the component with
	* @param {String} [data.value] - the string to search through
	* @param {Number} [data.cursorPosition] - The position of the cursor in the string
	*/
   readWordAtCursor(data) {
      var word = '', index = data.cursorPosition
      var valueWithReplacedSpecial = data.value.replace(/\n/g, ' ');

      while(index--){
         var previousCharacter = valueWithReplacedSpecial[index]
         if(previousCharacter == ' ' || index < 0) break
      }

      while(index++ < valueWithReplacedSpecial.length-1) {
         var nextCharacter = valueWithReplacedSpecial[index]
         if(nextCharacter == ' ') break
         word += nextCharacter
      }

      return { index: Math.max(index-word.length, 0), word: word }
   }

	/**
	* Show/Hide the options list
	* @param {Boolean} toggle - show or hide
	*/
	toggleOptions(toggle) {
      this.html.optionsList.classList.remove('show')
      if(toggle) this.html.optionsList.classList.add('show')
      this.showingOptions = toggle
   }

	/**
	* Loop the options and show/hide options based on match function
	*/
	optionsMatch() {
      for(var option in this.options) {
         var word = this.wordAtCursor.word.replace('@', '')
         this.html.options[option].classList.remove('show')

         if(this.match(word, this.options[option])) this.html.options[option].classList.add('show')
      }
   }

	/**
	* Using up/down arrow selects the next option
	*/
   setHoverOption() {
      var viewableOptions = this.html.options.filter((e) => {
         e.classList.remove('hover')
         return e.classList.contains('show')
      })
      if(!viewableOptions.length) return

      this.hover = this.upDownStay ? this.hover + this.upDownStay : 0
      if(this.hover < 0){ this.hover = viewableOptions.length - 1 }
      if(this.hover == viewableOptions.length) { this.hover = 0}
      viewableOptions[this.hover].classList.add('hover')
   }

   /**
   * Sets the cursor position in the text area
   * @param {Number} position - the position
   */
   setCursorPosition(position) {
      this.cursorPosition = position
      this.html.input.setSelectionRange(position, position);
   }

	/**
	* Returns the mentions form the input. Returns the value of the option with its properties
	*/
   collect() {
      var data = []
      var added = this.html.display.querySelectorAll('u')
      for(var add of added) {
         data.push(JSON.parse(add.getAttribute('mentiondata')))
      }
      return data
   }

   /**
   * Loops through the word matches and replaces them with underlines
   * @returns {string} the input value in an html form
   */
   convertInputValueToHTML() {
      var words = this.findMatches()
      var inputValue = this.html.input.value.split('')
      for(var word of words) {
         for(var option of this.options) {
            if(this.symbol+(option.name || option) == word.word) {
               var optionHTML = document.createElement('u')
               optionHTML.innerHTML = word.word
               optionHTML.setAttribute('mentiondata', JSON.stringify(option))

               inputValue.splice(word.index, word.word.length, optionHTML.outerHTML)
            }
         }
      }

      // Replace Line breaks and spaces with HTML
      inputValue = inputValue.join('')
      if(inputValue[inputValue.length-1] != ' ') inputValue += '&nbsp;'
      return inputValue
   }

   /**
	* Loops over the input value.
   * @return {match[]} - Array of matches { word: word, index: index word is at}
	*/
   findMatches() {
      var inputValue = this.html.input.value.split('').concat([' '])
      var words = []

      var currentWord = ''
      for(var index in inputValue) {
         var letter = inputValue[index]
         var lastLetter = inputValue[index-1] || ' '
         var lastLetterIsSpace = [' ', '\\n'].indexOf(lastLetter) > -1 || lastLetter.charCodeAt(0) == 10
         var canStartWord = letter.includes(this.symbol) && lastLetterIsSpace

         if((canStartWord || currentWord.length) && letter != ' ') currentWord += letter

         if(currentWord.length && (letter == ' ')){
            words.unshift({ word: currentWord, index: Math.max(index-currentWord.length, 0) })
            currentWord = ''
         }
      }

      return words
   }

	/**
	* Removes the HTML and listeners
	*/
   deconctruct() {

   }
}

if(typeof module != 'undefined') module.exports = Mention
