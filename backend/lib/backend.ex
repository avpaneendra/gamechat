defmodule Backend do
	@moduledoc """
	Documentation for Backend.
	"""

	def start(_type, _args) do
		IO.puts "start"

		Backend.Supervisor.start_link(name: Backend.Supervisor)

		dispatch = :cowboy_router.compile([
			{:_, [
				{"/", RootPageHandler, []}, 
				{"/ws", WebsocketHandler, []}
			]},
		])

		{:ok, _} = :cowboy.start_clear(:http, 
			[{ :port, 8080 }], 
			%{
				:env => %{ :dispatch => dispatch }
			}
		)

	end

end
