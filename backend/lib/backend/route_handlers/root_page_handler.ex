defmodule Backend.RootPageHandler do
	
	def init(req, state) do
		handle(req, state)
	end

	def handle(request, state) do 
		IO.puts "handling"
		req = :cowboy_req.reply(
			200,
			%{"content-type" => "text/plain"},
			"hello",
			request
		)

		{:ok, req, state}
	end
end