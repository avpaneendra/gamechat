defmodule Backend.Game.Navigator do
	use GenServer

	# in this game, each player has a cube with a color.
	# they can move their cube around, and they send inputs.
	# here we figure out what the previous position was, and apply the update.
	# everything moves in normalized space [-1, 1]

	def start_link({room_id, game}) do
	
		IO.puts "initting game"
		# the last empty map is user_id: [x, y].
		GenServer.start_link(__MODULE__, {room_id, game}, name: {:via, Registry, {Backend.GameRegistry, {room_id, game}}})
	end

	def handle(pid, "move", json, %{room_id: room_id, user_id: user_id, game: game}) do
		
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

		GenServer.cast(pid, {:move, user_id, direction})

	end

	def handle_cast({:move, user_id, direction}, state) do
		IO.puts "move"
		IO.inspect user_id
		IO.inspect direction
		IO.inspect state

		{:noreply, state}

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