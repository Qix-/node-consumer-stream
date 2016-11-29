consumerStream = require '../'
should = require 'should'

Error.stackTraceLimit = Infinity

it 'should not emit an empty string', ->
	s = consumerStream()
	s.on 'line', -> should.fail null, null, 'line was called back on an empty string'
	s.write ''

it 'should emit a single line without a trailing newline', (cb) ->
	s = consumerStream()
	s.on 'line', (str, line) ->
		line.should.equal 1
		str.toString('utf8').should.equal 'Hello, world!'
		cb()
	s.write 'Hello, world!'
	s.end()

it 'should emit a single line with a trailing newline', (cb) ->
	s = consumerStream()
	s.on 'line', (str, line) ->
		line.should.equal 1
		str.toString('utf8').should.equal 'Hello, world!'
		cb()
	s.write 'Hello, world!\n'
	s.end()

it 'should emit two lines with appropriate line numbers', (cb) ->
	s = consumerStream()
	count = 0
	s.on 'line', (str, line) ->
		line.should.equal (count++ + 1)
		str.toString('utf8').should.equal ['Roses are red', 'Violets are blue'][line - 1]
		cb() if count is 2
	s.write 'Roses are red\n'
	s.write 'Violets are blue\n'
	s.end()

it 'should only emit when there is a new line', (cb) ->
	s = consumerStream()
	s.on 'line', (str, line) ->
		line.should.equal 1
		str.toString('utf8').should.equal 'nanananananana batman!'
		cb()
	s.write('na') for i in [0...7]
	s.write ' batman!'
	s.write '\n'
	s.end()

it 'should be able to handle large lines of text', (cb) ->
	s = consumerStream()
	s.on 'line', (str, line) ->
		line.should.equal 1
		str.toString('utf8').should.equal 'open source is fun'.repeat(10000)
		cb()
	s.write('open source is fun') for i in [0...10000]
	s.end()
