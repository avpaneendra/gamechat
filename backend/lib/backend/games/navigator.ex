defmodule Backend.Game.Navigator do
	use GenServer

	def start_link({room_id, game}) do
	
		IO.puts "initting game"
		# the last empty map is user_id: [x, y].
		GenServer.start_link(__MODULE__, {room_id, game, %{}}, name: {:via, Registry, {Backend.GameRegistry, {room_id, game}}})
	end

	def user_enter(pid, user_id) do
		GenServer.call(pid, {:user_enter, user_id})
	end

	def user_exit(pid, user_id) do
		GenServer.cast(pid, {:user_exit, user_id})
	end

	def handle(pid, "move", json, %{room_id: room_id, user_id: user_id, game: game}) do
		
		# look up this persons previous state
		# state is just position, velocity & timestamp

		%{"payload" => %{"direction" => direction}} = json
		positions = GenServer.call(pid, {:move, user_id, direction})

		%{
			type: "state",
			payload: positions
		}
	end

	def handle(pid, "shape", json, %{room_id: room_id, user_id: user_id, game: game}) do

		%{"payload" => %{"shape" => shape }} = json

		positions = GenServer.call(pid, {:shape, user_id, shape})
	end

	def handle(pid, "spin", json, %{user_id: uid} = state) do
		%{"payload" => %{"spin" => direction}} = json

		increment = 0.01
		# xspin, yspin, zspin
		case direction do
			"x-up" -> GenServer.call(pid, {:spin, uid, :xspin, increment})
			"x-down" -> GenServer.call(pid, {:spin, uid, :xspin, -increment})
			"yup" -> GenServer.call(pid, {:spin, uid, :yspin, increment})
			"ydown" -> GenServer.call(pid, {:spin, uid, :yspin, -increment})
			"zup" -> GenServer.call(pid, {:spin, uid, :zspin, increment})
			"zdown" -> GenServer.call(pid, {:spin, uid, :zspin, -increment})
			other -> IO.puts other
		end

	end

	def handle_call({:user_enter, user_id}, _from, {room_id, game, positions}) do

		positions = Map.put(positions, user_id, %{x: 0, y: 0, shape: "box", xspin: 0, yspin: 0, zspin: 0})

		{:reply, :poop, {room_id, game, positions}}
	end

	def handle_cast({:user_exit, user_id}, {room_id, game, positions} = state) do
		# check if there are any other users
		# if not, kill urself

		positions = Map.delete(positions, user_id)

		if (length(Map.keys(positions)) == 0) do
			{:stop, :empty_game, {room_id, game, positions}}
		else
			{:noreply, {room_id, game, positions}}
		end

	end

	def handle_call({:move, user_id, direction}, _from, {room_id, game, positions} = state) do
		# IO.puts "move"

		%{x: x, y: y } = loc = if (Map.has_key?(positions, user_id)), do: positions[user_id], else: %{x: 0, y: 0, shape: "box"}

		case direction do
			"ArrowLeft" -> 
				# IO.puts "left"
				x = x - 10
			"ArrowRight" -> 
				# IO.puts "right"
				x = x + 10
			"ArrowUp" -> 
				# IO.puts "up"
				y = y + 10
			"ArrowDown" -> 
				# IO.puts "down"
				y = y - 10
			_ -> IO.puts "no match for direction"
		end

		loc = loc
		|> Map.put(:x, x)
		|> Map.put(:y, y)

		positions = Map.put(positions, user_id, loc)

		{:reply, positions, {room_id, game, positions}}

	end

	def handle_call({:shape, user_id, shape}, _from, {room_id, game, positions} = state) do
		
		loc = if (Map.has_key?(positions, user_id)), do: positions[user_id], else: %{x: 0, y: 0, shape: "box"}

		positions = Map.put(positions, user_id, Map.put(loc, :shape, shape))

		{:reply, positions, {room_id, game, positions}}
	end

	def handle_call({:spin, user_id, direction}, _from, {room_id, game, positions} = state) do

		loc = positions[user_id]

		curr = Map.get(loc, direction)

		positions = Map.put(positions, user_id, Map.put(loc, direction, curr + 0.01))

		{:reply, positions, {room_id, game, positions}}


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