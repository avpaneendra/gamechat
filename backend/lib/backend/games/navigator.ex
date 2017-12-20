defmodule Backend.Game.Navigator do
	use GenServer

	# in this game, each player has a cube with a color.
	# they can move their cube around, and they send inputs.
	# here we figure out what the previous position was, and apply the update.
	# everything moves in normalized space [-1, 1]

	def handle("move", json, %{room_id: room_id, user_id: user_id, game: game} = state) do
		
		# look up this persons previous state
		# state is just position, velocity & timestamp

		%{"payload" => %{"direction" => direction}} = json

		case direction do
			"ArrowLeft" -> IO.puts "left"
			"ArrowRight" -> IO.puts "right"
			"ArrowUp" -> IO.puts "up"
			"ArrowDown" -> IO.puts "down"
			_ -> IO.puts "no match for direction"
		end

	end

	def handle(type, json, state) do
		IO.inspect type
		IO.inspect json 
		IO.inspect state
	end
	

	def handle(type, json, state) do
		# this thing needs to be initted
	end

end